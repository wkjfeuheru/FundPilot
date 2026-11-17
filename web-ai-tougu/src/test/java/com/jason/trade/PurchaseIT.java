package com.jason.trade;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.mysql.MySQLContainer;
import javax.sql.DataSource;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @Testcontainers
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class PurchaseIT {
    @Container @ServiceConnection static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.0")
        .withDatabaseName("tougu_platform").withUrlParam("connectionTimeZone", "UTC").withCommand("--log-bin-trust-function-creators=1");
    @Container static final GenericContainer<?> REDIS = new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r) {
        r.add("spring.data.redis.host", REDIS::getHost); r.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
    }
    @BeforeAll static void schema(@Autowired DataSource ds) {
        new ResourceDatabasePopulator(new FileSystemResource("../scripts/sql/schema.sql")).execute(ds);
    }
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired org.springframework.data.redis.core.StringRedisTemplate redis;
    @BeforeEach void fund() {
        jdbc.update("DELETE FROM trade_order_item"); jdbc.update("DELETE FROM ta_receipt"); jdbc.update("DELETE FROM trade_order");
        jdbc.update("DELETE FROM fund"); jdbc.update("DELETE FROM trading_day");
        jdbc.update("INSERT INTO fund(id,fund_code,name,fund_type,risk_level,latest_nav,latest_nav_date,fee_purchase) VALUES (101,'000311','指数测试',1,4,2.5000,'2026-11-13',0.1200)");
    }
    @Test void quoteUsesDecimalFeesAndWarnsWithoutReservingCash() throws Exception {
        var u=login("INVESTOR");
        quote(u,"1000.00").andExpect(status().isOk()).andExpect(jsonPath("$.data.feeAmount").value("1.20"))
            .andExpect(jsonPath("$.data.estimatedShares").value("399.5200"))
            .andExpect(jsonPath("$.data.riskAcknowledgmentRequired").value(false));
        quote(u,"50001.00").andExpect(status().isOk()).andExpect(jsonPath("$.data.warnings").isNotEmpty());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM trade_order",Integer.class)).isZero();
    }
    @Test void submissionFreezesOnlyAndReplaysExactlyOnce() throws Exception {
        var u=login("INVESTOR"); String key=key();
        String body=submit(u,key,"1000.00",false).andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.status").value("PENDING_TA"))
            .andExpect(jsonPath("$.data.taReceipt").isEmpty()).andExpect(jsonPath("$.data.items[0].shares").value("0.0000"))
            .andExpect(jsonPath("$.data.freezeAmount").value("1000.00")).andReturn().getResponse().getContentAsString();
        submit(u,key,"1000.00",false).andExpect(status().isCreated()).andExpect(header().string("Idempotent-Replayed","true"))
            .andExpect(content().json(body));
        mvc.perform(get("/api/v1/cash-accounts/current").session(u.session)).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.cashBalance").value("50000.00"))
            .andExpect(jsonPath("$.data.frozenAmount").value("1000.00"))
            .andExpect(jsonPath("$.data.availableCash").value("49000.00"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM holding WHERE user_id=?",Integer.class,u.id)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_log WHERE object_type='trade_order' AND actor_user_id=?",Integer.class,u.id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM trade_order",Integer.class)).isEqualTo(1);
        submit(u,key,"1001.00",false).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("COMMON_IDEMPOTENCY_CONFLICT"));
        submit(login("INVESTOR"),key,"1000.00",false).andExpect(status().isConflict());
    }
    @Test void riskIsRecheckedAtSubmissionAndFailedValidationDoesNotConsumeKey() throws Exception {
        var u=login("INVESTOR"); String key=key();
        quote(u,"100.00").andExpect(jsonPath("$.data.riskAcknowledgmentRequired").value(false));
        jdbc.update("INSERT INTO risk_profile(user_id,risk_level,valid_until) VALUES (?,1,'2099-01-01')",u.id);
        quote(u,"100.00").andExpect(jsonPath("$.data.riskAcknowledgmentRequired").value(true));
        submit(u,key,"100.00",false).andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("TRADE_RISK_ACKNOWLEDGEMENT_REQUIRED"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM idempotency_key WHERE idem_key=?",Integer.class,key)).isZero();
        submit(u,key,"100.00",true).andExpect(status().isCreated());
        jdbc.update("UPDATE risk_profile SET valid_until='2000-01-01' WHERE user_id=?",u.id);
        submit(u,key(),"100.00",false).andExpect(status().isCreated());
    }
    @Test void concurrentDistinctKeysCannotOverspendAndSameKeyCannotDoubleFreeze() throws Exception {
        var u=login("INVESTOR");
        try(var executor=Executors.newVirtualThreadPerTaskExecutor()) {
            var ready=new CountDownLatch(2); var start=new CountDownLatch(1);
            Callable<Integer> task=() -> {ready.countDown();start.await();return submit(u,key(),"30000.00",false).andReturn().getResponse().getStatus();};
            var a=executor.submit(task);var b=executor.submit(task);assertThat(ready.await(10,TimeUnit.SECONDS)).isTrue();start.countDown();
            assertThat(List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS))).containsExactlyInAnyOrder(201,422);
            String same=key();var c=executor.submit(() -> submit(u,same,"100.00",false).andReturn().getResponse().getStatus());
            var d=executor.submit(() -> submit(u,same,"100.00",false).andReturn().getResponse().getStatus());
            assertThat(List.of(c.get(15,TimeUnit.SECONDS),d.get(15,TimeUnit.SECONDS))).containsExactly(201,201);
        }
        mvc.perform(get("/api/v1/cash-accounts/current").session(u.session)).andExpect(jsonPath("$.data.availableCash").value("19900.00"));
    }
    @Test void orderReadsAreOwnedPaginatedAndValidated() throws Exception {
        var a=login("INVESTOR"); var b=login("INVESTOR");
        String body=submit(a,key(),"100.00",false).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        Number id=JsonPath.read(body,"$.data.id");
        mvc.perform(get("/api/v1/trade-orders/"+id).session(b.session)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/trade-orders?status=PENDING_TA&tradeType=PURCHASE&size=1").session(a.session))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalElements").value(1)).andExpect(jsonPath("$.data.content[0].targetLabel").value("指数测试"));
        mvc.perform(get("/api/v1/trade-orders").session(b.session)).andExpect(jsonPath("$.data.totalElements").value(0));
        for(String query:List.of("status=XXX","page=0","size=101","from=2027-01-01&to=2026-01-01","from=no-date"))
            mvc.perform(get("/api/v1/trade-orders?"+query).session(a.session)).andExpect(status().isBadRequest());
    }
    @Test void constraintsAndRoleBoundariesRejectBeforeAnyWrite() throws Exception {
        var u=login("INVESTOR");
        submit(u,key(),"99.99",false).andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("TRADE_AMOUNT_BELOW_MIN"));
        submit(u,key(),"50000.01",false).andExpect(status().isUnprocessableEntity());
        for(String amount:List.of("1e3","NaN","100.001","-100.00","10000000000000000.00")) quote(u,amount).andExpect(status().isBadRequest());
        submit(u,"bad","100.00",false).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/trade-orders/purchases").session(u.session).header("X-CSRF-Token",u.csrf).contentType("application/json").content(request("100.00",false))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/trade-orders/purchases").session(u.session).contentType("application/json").content(request("100.00",false))).andExpect(status().isForbidden());
        submit(login("ADVISOR"),key(),"100.00",false).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/trade-orders")).andExpect(status().isUnauthorized());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM trade_order",Integer.class)).isZero();
    }
    @Test void riskAcknowledgementDefaultsFalseAndMoneyRequiresAString() throws Exception {
        var u=login("INVESTOR");
        mvc.perform(post("/api/v1/trade-orders/purchases").session(u.session).header("X-CSRF-Token",u.csrf)
            .header("Idempotency-Key",key()).contentType("application/json").content("{\"fundId\":101,\"amount\":\"100.00\"}"))
            .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/trade-order-quotes/purchases").session(u.session).header("X-CSRF-Token",u.csrf)
            .contentType("application/json").content("{\"fundId\":101,\"amount\":100.12}"))
            .andExpect(status().isBadRequest());
    }
    @Test void nonTradingDateRollsForwardAndSuspendedFundStillSubmitsWithWarning() throws Exception {
        var u=login("INVESTOR");var today=LocalDate.now(ZoneId.of("Asia/Shanghai"));
        jdbc.update("INSERT INTO trading_day(cal_date,is_trading_day) VALUES (?,0),(?,0),(?,1)",today,today.plusDays(1),today.plusDays(2));
        jdbc.update("UPDATE fund SET purchase_status=3");
        submit(u,key(),"100.00",false).andExpect(status().isCreated()).andExpect(jsonPath("$.data.tradeDate").value(today.plusDays(2).toString()))
            .andExpect(jsonPath("$.data.remark",org.hamcrest.Matchers.containsString("TA 可能确认失败")));
    }
    @Test void auditFailureRollsBackOrderItemsAndIdempotency() throws Exception {
        var u=login("INVESTOR");String key=key();
        jdbc.execute("CREATE TRIGGER fail_purchase_audit BEFORE INSERT ON audit_log FOR EACH ROW BEGIN IF NEW.object_type='trade_order' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='acceptance failure'; END IF; END");
        try { submit(u,key,"100.00",false).andExpect(status().is5xxServerError()); }
        finally {jdbc.execute("DROP TRIGGER fail_purchase_audit");}
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM trade_order",Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM trade_order_item",Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM idempotency_key WHERE idem_key=?",Integer.class,key)).isZero();
        submit(u,key,"100.00",false).andExpect(status().isCreated());
    }
    @Test void cacheLossAndOtherPathKeyNeverProduceDuplicateOrders() throws Exception {
        var u=login("INVESTOR");String key=key();
        submit(u,key,"100.00",false).andExpect(status().isCreated());
        Long id=jdbc.queryForObject("SELECT id FROM idempotency_key WHERE idem_key=?",Long.class,key);
        redis.delete("fundpilot:purchase:response:"+id);
        submit(u,key,"100.00",false).andExpect(status().isConflict());
        String other=key();
        jdbc.update("INSERT INTO idempotency_key(idem_key,user_id,request_path,request_digest,expires_at) VALUES(?,?,'POST /api/v1/risk-assessments','other',DATE_ADD(UTC_TIMESTAMP(),INTERVAL 7 DAY))",other,u.id);
        submit(u,other,"100.00",false).andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM trade_order",Integer.class)).isEqualTo(1);
    }
    @Test void missingFundAndInvalidNavCannotFreezeCash() throws Exception {
        var u=login("INVESTOR");
        jdbc.update("UPDATE fund SET latest_nav=0");
        submit(u,key(),"100.00",false).andExpect(status().isConflict());
        jdbc.update("UPDATE fund SET deleted_at=UTC_TIMESTAMP(3)");
        submit(u,key(),"100.00",false).andExpect(status().isNotFound());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM trade_order",Integer.class)).isZero();
    }
    @Test void terminalReceiptsAreReadonlyAndDoNotCountAsPendingFreezes() throws Exception {
        var u=login("INVESTOR");
        var result=submit(u,key(),"100.00",false).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        Number id=JsonPath.read(result,"$.data.id");
        // A terminal fixture represents the later TA module; this module has no confirmation write path.
        jdbc.update("UPDATE trade_order SET status=3 WHERE id=?",id.longValue());
        jdbc.update("INSERT INTO ta_receipt(order_id,receipt_no,result,confirm_date,nav_date,unit_nav,fail_reason,received_at) VALUES (?,'TA-TEST-001',2,'2026-11-17','2026-11-16',2.5,1,UTC_TIMESTAMP(3))",id.longValue());
        mvc.perform(get("/api/v1/trade-orders?status=FAILED").session(u.session)).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[0].taReceipt.failReason").value("PURCHASE_SUSPENDED"));
        mvc.perform(get("/api/v1/trade-orders/"+id).session(u.session)).andExpect(jsonPath("$.data.taReceipt.result").value("FAILED"));
        mvc.perform(get("/api/v1/cash-accounts/current").session(u.session)).andExpect(jsonPath("$.data.availableCash").value("50000.00"));
    }
    private String key(){return UUID.randomUUID().toString();}
    private String request(String amount,boolean ack){return "{\"fundId\":101,\"amount\":\""+amount+"\",\"riskAcknowledged\":"+ack+"}";}
    private ResultActions quote(Login u,String amount) throws Exception {return mvc.perform(post("/api/v1/trade-order-quotes/purchases").session(u.session).header("X-CSRF-Token",u.csrf).contentType("application/json").content("{\"fundId\":101,\"amount\":\""+amount+"\"}"));}
    private ResultActions submit(Login u,String key,String amount,boolean ack) throws Exception {return mvc.perform(post("/api/v1/trade-orders/purchases").session(u.session).header("X-CSRF-Token",u.csrf).header("Idempotency-Key",key).contentType("application/json").content(request(amount,ack)));}
    private record Login(MockHttpSession session,String csrf,long id) {}
    private Login login(String role) throws Exception {
        String username="purchase-"+UUID.randomUUID();
        mvc.perform(post("/api/v1/auth/registrations").contentType("application/json").content("{\"username\":\""+username+"\",\"password\":\"password123\",\"displayName\":\"测试\",\"role\":\""+role+"\"}")).andExpect(status().isCreated());
        var result=mvc.perform(post("/api/v1/auth/sessions").contentType("application/json").content("{\"username\":\""+username+"\",\"password\":\"password123\"}")).andExpect(status().isOk()).andReturn();
        String body=result.getResponse().getContentAsString();Number id=JsonPath.read(body,"$.data.user.id");
        return new Login((MockHttpSession)result.getRequest().getSession(),JsonPath.read(body,"$.data.csrfToken"),id.longValue());
    }
}
