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

@SpringBootTest(properties={"app.ta.enabled=true","app.ta.demo-user-id=101","app.ta.dispatch-delay-ms=200"}) @AutoConfigureMockMvc @Testcontainers
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class TaReceiptIT {
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
    @BeforeEach void fixtures(){
        for(String table:List.of("ta_receipt","trade_order_item","trade_order","holding","event_outbox","rebalance_advice","fund_nav","fund","cash_account"))jdbc.update("DELETE FROM "+table);
        jdbc.update("INSERT IGNORE INTO user(id,username,password_hash,display_name,role) VALUES(101,'ta-demo','unused','TA演示客户',1),(102,'ta-other','unused','范围外客户',1)");
        jdbc.update("INSERT INTO cash_account(user_id,cash_balance) VALUES(101,50000),(102,50000)");
        jdbc.update("INSERT INTO fund(id,fund_code,name,fund_type,risk_level,latest_nav,latest_nav_date,fee_purchase,fee_redeem) VALUES(201,'000311','测试权益',1,4,9,'2026-11-17',0.12,0.5),(202,'110027','测试债券',2,2,5,'2026-11-17',0.1,0.5)");
        jdbc.update("INSERT INTO fund_nav(fund_id,nav_date,unit_nav) VALUES(201,'2026-11-13',2.5),(202,'2026-11-13',5)");
    }
    private void purchase(long id,long user){
        jdbc.update("INSERT INTO trade_order(id,order_code,user_id,trade_type,trade_date,total_amount_in,total_fee,freeze_amount) VALUES(?,?,?,1,'2026-11-13',1000,1.2,1000)",id,"T-TEST-"+id,user);
        jdbc.update("INSERT INTO trade_order_item(order_id,fund_id,direction,amount,fee) VALUES(?,201,1,1000,1.2)",id);
    }
    private ResultActions receipt(long id,String key,String result,String reason) throws Exception {
        return mvc.perform(post("/api/v1/ta/trade-orders/"+id+"/ta-receipts").header("Idempotency-Key",key).contentType("application/json").content("{\"result\":\""+result+"\""+(reason==null?"":",\"failReason\":\""+reason+"\"")+"}"));
    }
    private String key(){return UUID.randomUUID().toString();}
    @Test void confirmsPurchaseAtTradeDateNavAndReplaysWithoutDoubleSettlement() throws Exception {
        purchase(301,101);String key=key();
        mvc.perform(get("/api/v1/ta/trade-orders/301/receipt-preview")).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.receiptNo").value("TA20261116301"));
        String body=receipt(301,key,"SUCCESS",null).andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("CONFIRMED"))
            .andExpect(jsonPath("$.data.taReceipt.confirmDate").value("2026-11-16"))
            .andExpect(jsonPath("$.data.taReceipt.unitNav").value("2.5000"))
            .andExpect(jsonPath("$.data.items[0].confirmedShares").value("399.5200"))
            .andReturn().getResponse().getContentAsString();
        receipt(301,key,"SUCCESS",null).andExpect(header().string("Idempotent-Replayed","true")).andExpect(content().json(body));
        receipt(301,key(),"SUCCESS",null).andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT cash_balance FROM cash_account WHERE user_id=101",java.math.BigDecimal.class)).isEqualByComparingTo("49000");
        assertThat(jdbc.queryForObject("SELECT cost_amount FROM holding WHERE user_id=101",java.math.BigDecimal.class)).isEqualByComparingTo("998.80");
        mvc.perform(get("/api/v1/ta/summary")).andExpect(jsonPath("$.data.frozenAmount").value("0.00")).andExpect(jsonPath("$.data.pendingCount").value(0));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ta_receipt",Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM event_outbox WHERE aggregate_id=301",Integer.class)).isEqualTo(1);
    }
    @Test void failedReceiptReleasesFreezeWithoutChangingCashOrHoldings() throws Exception {
        purchase(302,101);
        receipt(302,key(),"FAILED",null).andExpect(status().isBadRequest());
        receipt(302,key(),"FAILED","NONE").andExpect(status().isBadRequest());
        receipt(302,key(),"FAILED","PURCHASE_SUSPENDED").andExpect(status().isOk()).andExpect(jsonPath("$.data.taReceipt.failReason").value("PURCHASE_SUSPENDED"));
        mvc.perform(get("/api/v1/ta/summary")).andExpect(jsonPath("$.data.availableCash").value("50000.00"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM holding",Integer.class)).isZero();
    }
    @Test void scopeAppliesToEveryReadWriteAndBatch(){
        purchase(301,101);purchase(302,102);
        try{
            mvc.perform(get("/api/v1/ta/trade-orders")).andExpect(jsonPath("$.data.totalElements").value(1)).andExpect(jsonPath("$.data.content[0].customerUserId").value(101));
            receipt(302,key(),"SUCCESS",null).andExpect(status().isNotFound());
            mvc.perform(get("/api/v1/ta/trade-orders/302/receipt-preview")).andExpect(status().isNotFound());
            mvc.perform(post("/api/v1/ta/receipt-batches").header("Idempotency-Key",key()).contentType("application/json").content("{\"result\":\"SUCCESS\",\"orderIds\":[302]}" )).andExpect(status().isNotFound());
        }catch(Exception e){throw new AssertionError(e);}
        assertThat(jdbc.queryForObject("SELECT status FROM trade_order WHERE id=302",Integer.class)).isEqualTo(1);
    }
    @Test void missingNavAndAuditFailureLeaveWholeOrderUntouched() throws Exception {
        purchase(303,101);jdbc.update("DELETE FROM fund_nav WHERE fund_id=201");
        receipt(303,key(),"SUCCESS",null).andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("TA_NAV_NOT_AVAILABLE"));
        jdbc.update("INSERT INTO fund_nav(fund_id,nav_date,unit_nav) VALUES(201,'2026-11-13',2.5)");
        jdbc.execute("CREATE TRIGGER fail_ta_audit BEFORE INSERT ON audit_log FOR EACH ROW BEGIN IF NEW.actor_role=3 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='acceptance failure'; END IF; END");
        try{receipt(303,key(),"SUCCESS",null).andExpect(status().is5xxServerError());}finally{jdbc.execute("DROP TRIGGER fail_ta_audit");}
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ta_receipt",Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM holding",Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT status FROM trade_order WHERE id=303",Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT cash_balance FROM cash_account WHERE user_id=101",java.math.BigDecimal.class)).isEqualByComparingTo("50000");
    }
    @Test void concurrentReceiptsSettleExactlyOnce() throws Exception {
        purchase(304,101);
        try(var executor=Executors.newVirtualThreadPerTaskExecutor()){
            var gate=new CountDownLatch(1);
            Callable<Integer> task=()->{gate.await();return receipt(304,key(),"SUCCESS",null).andReturn().getResponse().getStatus();};
            var a=executor.submit(task);var b=executor.submit(task);gate.countDown();
            assertThat(List.of(a.get(20,TimeUnit.SECONDS),b.get(20,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ta_receipt",Integer.class)).isEqualTo(1);
    }
    @Test void batchCommitsSuccessfulOrdersAndReplaysPartialFailure() throws Exception {
        purchase(305,101);purchase(306,101);jdbc.update("UPDATE trade_order SET trade_date='2026-11-12' WHERE id=306");
        String key=key();String request="{\"result\":\"SUCCESS\"}";
        var body=mvc.perform(post("/api/v1/ta/receipt-batches").header("Idempotency-Key",key).contentType("application/json").content(request))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.succeeded").value(1)).andExpect(jsonPath("$.data.failed[0].code").value("TA_NAV_NOT_AVAILABLE")).andReturn().getResponse().getContentAsString();
        mvc.perform(post("/api/v1/ta/receipt-batches").header("Idempotency-Key",key).contentType("application/json").content(request)).andExpect(content().json(body)).andExpect(header().string("Idempotent-Replayed","true"));
        assertThat(jdbc.queryForObject("SELECT status FROM trade_order WHERE id=306",Integer.class)).isEqualTo(1);
    }
    @Test void redemptionAndRebalancePreserveProportionalCostAndNetCash() throws Exception {
        jdbc.update("INSERT INTO holding(user_id,fund_id,shares,cost_amount) VALUES(101,201,20,40)");
        jdbc.update("INSERT INTO trade_order(id,order_code,user_id,trade_type,trade_date,total_amount_out,total_fee) VALUES(307,'T-REDEEM',101,2,'2026-11-13',25,0.13)");
        jdbc.update("INSERT INTO trade_order_item(order_id,fund_id,direction,shares,fee) VALUES(307,201,2,10,0.13)");
        receipt(307,key(),"SUCCESS",null).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT shares FROM holding WHERE fund_id=201",java.math.BigDecimal.class)).isEqualByComparingTo("10");
        assertThat(jdbc.queryForObject("SELECT cost_amount FROM holding WHERE fund_id=201",java.math.BigDecimal.class)).isEqualByComparingTo("20");
        jdbc.update("INSERT INTO trade_order(id,order_code,user_id,trade_type,trade_date,total_amount_in,total_amount_out,total_fee,freeze_amount) VALUES(308,'T-REBAL',101,3,'2026-11-13',25,25,0.06,0.06)");
        jdbc.update("INSERT INTO trade_order_item(order_id,fund_id,direction,amount,shares,fee) VALUES(308,201,2,25,0,0.03),(308,202,1,25,0,0.03)");
        receipt(308,key(),"SUCCESS",null).andExpect(status().isOk()).andExpect(jsonPath("$.data.taReceipt.unitNav").value("0.0000"));
        assertThat(jdbc.queryForObject("SELECT cost_amount FROM holding WHERE fund_id=201",java.math.BigDecimal.class)).isEqualByComparingTo("0");
        assertThat(jdbc.queryForObject("SELECT cost_amount FROM holding WHERE fund_id=202",java.math.BigDecimal.class)).isEqualByComparingTo("24.97");
        assertThat(jdbc.queryForObject("SELECT cash_balance FROM cash_account WHERE user_id=101",java.math.BigDecimal.class)).isEqualByComparingTo("50024.81");
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.CsvSource({"FAILED,6","SUCCESS,3"})
    void adviceReceivesDurableTerminalEvent(String result,int expectedStatus) throws Exception {
        purchase(309,101);
        jdbc.update("INSERT INTO rebalance_advice(id,advice_code,customer_user_id,advisor_user_id,status,pushed_at,valid_until) VALUES(401,'RA-TEST',101,999,2,UTC_TIMESTAMP(),'2026-12-01')");
        jdbc.update("UPDATE trade_order SET advice_id=401 WHERE id=309");
        receipt(309,key(),result,"FAILED".equals(result)?"TRADING_STATUS_ABNORMAL":null).andExpect(status().isOk());
        long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(12);
        while(System.nanoTime()<deadline && jdbc.queryForObject("SELECT status FROM rebalance_advice WHERE id=401",Integer.class)!=expectedStatus)Thread.sleep(100);
        assertThat(jdbc.queryForObject("SELECT status FROM rebalance_advice WHERE id=401",Integer.class)).isEqualTo(expectedStatus);
        assertThat(jdbc.queryForObject("SELECT dispatch_status FROM event_outbox WHERE aggregate_id=309",Integer.class)).isEqualTo(2);
        jdbc.update("INSERT INTO event_outbox(event_type,aggregate_type,aggregate_id,payload,next_retry_at) SELECT event_type,aggregate_type,aggregate_id,payload,UTC_TIMESTAMP(3) FROM event_outbox WHERE aggregate_id=309");
        dispatcher.dispatch();
        assertThat(jdbc.queryForObject("SELECT version FROM rebalance_advice WHERE id=401",Integer.class)).isEqualTo(1);
    }
    private MockHttpSession session(long id,com.jason.auth.dto.Role role){
        var principal=new com.jason.auth.security.SessionPrincipal(id,"test",role);
        var context=new org.springframework.security.core.context.SecurityContextImpl(
            org.springframework.security.authentication.UsernamePasswordAuthenticationToken.authenticated(principal,null,
                List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_"+role.name()))));
        var session=new MockHttpSession();session.setAttribute("SPRING_SECURITY_CONTEXT",context);return session;
    }
    @Test void confirmedHoldingsAndScopedAdvisorHistoryReadSameCommittedFacts() throws Exception {
        purchase(310,101);receipt(310,key(),"SUCCESS",null).andExpect(status().isOk());
        mvc.perform(get("/api/v1/holdings").session(session(101,com.jason.auth.dto.Role.INVESTOR)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.items[0].shares").value("399.5200"))
            .andExpect(jsonPath("$.data.summary.costAmount").value("998.80"));
        mvc.perform(get("/api/v1/holdings").session(session(102,com.jason.auth.dto.Role.INVESTOR))).andExpect(jsonPath("$.data.items").isEmpty());
        jdbc.update("INSERT IGNORE INTO user(id,username,password_hash,display_name,role) VALUES(103,'ta-advisor','unused','顾问',2)");
        jdbc.update("INSERT IGNORE INTO customer(user_id) VALUES(101)");
        jdbc.update("INSERT INTO advisor_customer_relation(advisor_user_id,customer_user_id,assigned_at) VALUES(103,101,UTC_TIMESTAMP(3))");
        mvc.perform(get("/api/v1/customers/101/trade-orders").session(session(103,com.jason.auth.dto.Role.ADVISOR)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.content[0].status").value("CONFIRMED"));
        mvc.perform(get("/api/v1/customers/102/trade-orders").session(session(103,com.jason.auth.dto.Role.ADVISOR))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/trading-days/current")).andExpect(status().isOk()).andExpect(jsonPath("$.data.timezone").value("Asia/Shanghai"));
    }
    @Test void cacheLossDoesNotExecuteAgainAndBatchEmptyIsExplicit() throws Exception {
        purchase(311,101);String key=key();receipt(311,key,"SUCCESS",null).andExpect(status().isOk());
        redis.getConnectionFactory().getConnection().serverCommands().flushDb();
        receipt(311,key,"SUCCESS",null).andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT cash_balance FROM cash_account WHERE user_id=101",java.math.BigDecimal.class)).isEqualByComparingTo("49000");
        mvc.perform(post("/api/v1/ta/receipt-batches").header("Idempotency-Key",key()).contentType("application/json").content("{\"result\":\"SUCCESS\"}"))
            .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("TA_BATCH_EMPTY"));
    }
    @Test void settlementCannotSpendOtherOrdersFrozenCash() throws Exception {
        purchase(312,101);purchase(313,101);jdbc.update("UPDATE cash_account SET cash_balance=1999 WHERE user_id=101");
        receipt(312,key(),"SUCCESS",null).andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ta_receipt",Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM holding",Integer.class)).isZero();
    }
    @Autowired com.jason.platform.service.WriteReplay replay;
    @Autowired com.jason.platform.service.TerminalEventDispatcher dispatcher;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactionManager;
    @Test void requestDigestIsIndependentOfMapIterationOrder(){
        String key=key();var first=new LinkedHashMap<String,Object>();first.put("z",1);first.put("a",2);
        var second=new LinkedHashMap<String,Object>();second.put("a",2);second.put("z",1);
        var transaction=new org.springframework.transaction.support.TransactionTemplate(transactionManager);
        transaction.executeWithoutResult(tx->{var claim=replay.claim(key,0,"POST /acceptance/canonical",first);replay.complete(claim.id(),"accepted",Duration.ofMinutes(5));});
        transaction.executeWithoutResult(tx->assertThat(replay.claim(key,0,"POST /acceptance/canonical",second).replayed()).isTrue());
    }
    @Test void exhaustedInvalidEventDoesNotOverflowAndBlockValidEvents() throws Exception {
        jdbc.update("INSERT INTO event_outbox(event_type,aggregate_type,aggregate_id,payload,retry_count,next_retry_at) VALUES('trade.confirmed','trade_order',999999,'{}',127,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 1 DAY))");
        purchase(314,101);receipt(314,key(),"SUCCESS",null).andExpect(status().isOk());
        jdbc.update("UPDATE event_outbox SET next_retry_at=UTC_TIMESTAMP(3)");
        dispatcher.dispatch();
        assertThat(jdbc.queryForObject("SELECT retry_count FROM event_outbox WHERE aggregate_id=999999",Integer.class)).isEqualTo(127);
        assertThat(jdbc.queryForObject("SELECT dispatch_status FROM event_outbox WHERE aggregate_id=314",Integer.class)).isEqualTo(2);
    }
    @Autowired com.jason.trade.service.ITradeService purchaseService;
    @Test void concurrentPurchaseAndReceiptShareTheCashReservationLock() throws Exception {
        purchase(315,101);jdbc.update("UPDATE cash_account SET cash_balance=2000 WHERE user_id=101");
        try(var executor=Executors.newVirtualThreadPerTaskExecutor()){
            var gate=new CountDownLatch(1);
            var confirmation=executor.submit(()->{gate.await();return receipt(315,key(),"SUCCESS",null).andReturn().getResponse().getStatus();});
            var submission=executor.submit(()->{gate.await();return purchaseService.purchase(101,key(),new com.jason.trade.dto.PurchaseRequest(201L,"1000.00",true),"ta-concurrent-purchase");});
            gate.countDown();assertThat(confirmation.get(20,TimeUnit.SECONDS)).isEqualTo(200);
            assertThat(submission.get(20,TimeUnit.SECONDS).response().data().getStatus()).isEqualTo("PENDING_TA");
        }
        mvc.perform(get("/api/v1/ta/summary")).andExpect(jsonPath("$.data.cashBalance").value("1000.00"))
            .andExpect(jsonPath("$.data.frozenAmount").value("1000.00")).andExpect(jsonPath("$.data.availableCash").value("0.00"));
        assertThat(jdbc.queryForObject("SELECT shares FROM holding WHERE user_id=101",java.math.BigDecimal.class)).isEqualByComparingTo("399.5200");
    }
}
