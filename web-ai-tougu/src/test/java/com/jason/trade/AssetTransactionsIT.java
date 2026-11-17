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
class AssetTransactionsIT {
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
    private String key(){return UUID.randomUUID().toString();}
    private ResultActions getAs(Login u,String path) throws Exception {return mvc.perform(get("/api/v1/"+path).session(u.session));}
    private ResultActions save(Login u,String key,String body) throws Exception {return mvc.perform(put("/api/v1/auto-invest-plans/current").session(u.session).header("X-CSRF-Token",u.csrf).header("Idempotency-Key",key).contentType("application/json").content(body));}
    private final String plan="{\"monthlyAmount\":\"300.00\",\"executeDay\":8,\"funds\":[{\"fundId\":901,\"monthlyAmount\":\"100.00\"},{\"fundId\":902,\"monthlyAmount\":\"200.00\"}]}";
    @BeforeEach void funds() {
        jdbc.update("DELETE FROM auto_invest_plan_fund");jdbc.update("DELETE FROM auto_invest_plan");
        jdbc.update("DELETE FROM holding");jdbc.update("DELETE FROM fund");
        jdbc.update("INSERT INTO fund(id,fund_code,name,fund_type,risk_level,latest_nav,latest_nav_date) VALUES (901,'900001','权益测试',1,4,2.0000,'2026-11-13'),(902,'900002','债券测试',2,2,1.0000,'2026-11-12')");
    }
    @Test void totalsExcludeFrozenOnlyFromAvailableAndAllocationUsesHoldings() throws Exception {
        var u=login("INVESTOR");
        jdbc.update("INSERT INTO holding(user_id,fund_id,shares,cost_amount) VALUES (?,901,100,150),(?,902,100,100)",u.id,u.id);
        jdbc.update("INSERT INTO trade_order(order_code,user_id,trade_type,trade_date,total_amount_in,freeze_amount) VALUES (?, ?,1,CURRENT_DATE,1000,1000)","T"+u.id,u.id);
        getAs(u,"asset-overviews/current").andExpect(status().isOk())
            .andExpect(jsonPath("$.data.totalAsset").value("50300.00")).andExpect(jsonPath("$.data.holdingMarketValue").value("300.00"))
            .andExpect(jsonPath("$.data.availableCash").value("49000.00")).andExpect(jsonPath("$.data.cumulativePnl").value("50.00"))
            .andExpect(jsonPath("$.data.cumulativePnlRate").value("20.00")).andExpect(jsonPath("$.data.allocation.length()").value(4))
            .andExpect(jsonPath("$.data.allocation[0].weight").value("66.67")).andExpect(jsonPath("$.data.topHoldings[0].fundId").value(901))
            .andExpect(jsonPath("$.data.topHoldings[0].shareRatio").value("0.40"))
            .andExpect(jsonPath("$.data.portfolioRiskLevel").isEmpty()).andExpect(jsonPath("$.data.insights.length()").value(3));
        getAs(login("INVESTOR"),"asset-overviews/current").andExpect(jsonPath("$.data.totalAsset").value("50000.00")).andExpect(jsonPath("$.data.topHoldings").isEmpty());
    }
    @Test void trendUsesRealSnapshotsAndRejectsUnknownRange() throws Exception {
        var u=login("INVESTOR");var today=LocalDate.now(ZoneId.of("Asia/Shanghai"));
        getAs(u,"asset-trends/current?range=1M").andExpect(status().isOk()).andExpect(jsonPath("$.data.points").isEmpty());
        jdbc.update("INSERT INTO asset_snapshot(user_id,snapshot_date,total_asset) VALUES (?,?,10000),(?,?,11000),(?,?,99999)",u.id,today.minusDays(20),u.id,today.minusDays(1),u.id,today.minusYears(2));
        getAs(u,"asset-trends/current?range=1M").andExpect(jsonPath("$.data.points.length()").value(2)).andExpect(jsonPath("$.data.points[0].portfolioReturnRate").value("0.00")).andExpect(jsonPath("$.data.summary.portfolioReturnRate").value("10.00"));
        getAs(u,"asset-overviews/current").andExpect(jsonPath("$.data.last30dPnl").value("1000.00"));
        getAs(u,"asset-trends/current?range=INVALID").andExpect(status().isBadRequest());
    }
    @Test void planIsAtomicIdempotentAndScoped() throws Exception {
        var u=login("INVESTOR");String key=key();
        getAs(u,"auto-invest-plans/current").andExpect(status().isNotFound());
        var body=save(u,key,plan).andExpect(status().isOk()).andExpect(jsonPath("$.data.monthlyAmount").value("300.00")).andExpect(jsonPath("$.data.funds.length()").value(2)).andReturn().getResponse().getContentAsString();
        save(u,key,plan).andExpect(header().string("Idempotent-Replayed","true")).andExpect(content().json(body));
        save(u,key,plan.replace("300.00","400.00")).andExpect(status().isConflict());
        getAs(login("INVESTOR"),"auto-invest-plans/current").andExpect(status().isNotFound());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_log WHERE object_type='auto_invest_plan' AND actor_user_id=?",Integer.class,u.id)).isEqualTo(1);
        getAs(u,"cash-accounts/current").andExpect(jsonPath("$.data.availableCash").value("50000.00"));
        String changed="{\"monthlyAmount\":\"400.00\",\"executeDay\":28,\"funds\":[{\"fundId\":902,\"monthlyAmount\":\"400.00\"}]}";
        save(u,key(),changed).andExpect(jsonPath("$.data.funds.length()").value(1)).andExpect(jsonPath("$.data.executeDay").value(28));
        save(u,key,plan).andExpect(content().json(body));
        getAs(u,"auto-invest-plans/current").andExpect(jsonPath("$.data.monthlyAmount").value("400.00"));
    }
    @Test void planValidatesMoneyDayDuplicatesAndFundExistence() throws Exception {
        var u=login("INVESTOR");
        save(u,key(),plan.replace("300.00","300.01")).andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("TRADE_AUTO_INVEST_AMOUNT_MISMATCH"));
        save(u,key(),plan.replace("902","901")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("TRADE_AUTO_INVEST_FUND_DUPLICATED"));
        save(u,key(),plan.replace("902","999")).andExpect(status().isNotFound());
        save(u,key(),plan.replace(":8,",":29,")).andExpect(status().isBadRequest());
        save(u,key(),plan.replace("\"300.00\"","300.00")).andExpect(status().isBadRequest());
        save(u,key(),plan.replace("100.00","0.00")).andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM auto_invest_plan WHERE user_id=?",Integer.class,u.id)).isZero();
    }
    @Test void permissionsCsrfAndPdfAudit() throws Exception {
        mvc.perform(get("/api/v1/asset-overviews/current")).andExpect(status().isUnauthorized());
        var advisor=login("ADVISOR");getAs(advisor,"asset-overviews/current").andExpect(status().isForbidden());
        getAs(advisor,"auto-invest-plans/current").andExpect(status().isForbidden());
        var u=login("INVESTOR");
        mvc.perform(put("/api/v1/auto-invest-plans/current").session(u.session).contentType("application/json").content(plan)).andExpect(status().isForbidden());
        var pdf=getAs(u,"asset-overviews/current/report").andExpect(status().isOk()).andExpect(content().contentType("application/pdf")).andReturn().getResponse().getContentAsByteArray();
        assertThat(new String(pdf,0,5,java.nio.charset.StandardCharsets.US_ASCII)).isEqualTo("%PDF-");
        try(var document=org.apache.pdfbox.Loader.loadPDF(pdf)){
            assertThat(document.getNumberOfPages()).isGreaterThanOrEqualTo(2);
            String text=new org.apache.pdfbox.text.PDFTextStripper().getText(document);
            assertThat(text).contains("资产报告","50000.00","免责声明与数据口径","不构成投资建议");
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_log WHERE actor_user_id=? AND action=7 AND object_type='asset_snapshot'",Integer.class,u.id)).isEqualTo(1);
    }
    @Test void zeroBaselineAndSingleSnapshotAreSafeAndFutureSnapshotsExcluded() throws Exception {
        var u=login("INVESTOR");var today=LocalDate.now(ZoneId.of("Asia/Shanghai"));
        jdbc.update("INSERT INTO asset_snapshot(user_id,snapshot_date,total_asset) VALUES (?,?,0)",u.id,today.minusDays(1));
        getAs(u,"asset-trends/current?range=1Y").andExpect(jsonPath("$.data.summary.portfolioReturnRate").value("0.00"));
        jdbc.update("INSERT INTO asset_snapshot(user_id,snapshot_date,total_asset) VALUES (?,?,1000),(?,?,999999)",u.id,today,u.id,today.plusDays(1));
        getAs(u,"asset-trends/current?range=1Y").andExpect(jsonPath("$.data.points.length()").value(2)).andExpect(jsonPath("$.data.summary.portfolioReturnRate").value("0.00"));
    }
    @Test void concurrentIdenticalPlanSavesAuditExactlyOnce() throws Exception {
        var u=login("INVESTOR");String key=key();
        try(var pool=Executors.newVirtualThreadPerTaskExecutor()){
            var start=new CountDownLatch(1);Callable<String> task=()->{start.await();return save(u,key,plan).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();};
            var a=pool.submit(task);var b=pool.submit(task);start.countDown();assertThat(a.get(20,TimeUnit.SECONDS)).isEqualTo(b.get(20,TimeUnit.SECONDS));
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_log WHERE object_type='auto_invest_plan' AND actor_user_id=?",Integer.class,u.id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM auto_invest_plan WHERE user_id=?",Integer.class,u.id)).isEqualTo(1);
    }
    @Test void auditFailureRollsBackPlanDetailsAndIdempotencyClaim() throws Exception {
        var u=login("INVESTOR");String key=key();
        jdbc.execute("ALTER TABLE audit_log ADD CONSTRAINT asset_test_audit CHECK (object_type <> 'auto_invest_plan' OR actor_user_id <> "+u.id+")");
        try{
            save(u,key,plan).andExpect(status().is5xxServerError());
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM auto_invest_plan WHERE user_id=?",Integer.class,u.id)).isZero();
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM idempotency_key WHERE idem_key=?",Integer.class,key)).isZero();
        }finally{jdbc.execute("ALTER TABLE audit_log DROP CHECK asset_test_audit");}
        save(u,key,plan).andExpect(status().isOk());
    }
    @Test void missingNavCannotSilentlyEraseHoldingValueAndPausedPlanStaysPaused() throws Exception {
        var u=login("INVESTOR");jdbc.update("INSERT INTO holding(user_id,fund_id,shares,cost_amount) VALUES (?,901,100,100)",u.id);
        jdbc.update("UPDATE fund SET latest_nav=0 WHERE id=901");
        getAs(u,"asset-overviews/current").andExpect(status().isConflict());
        save(u,key(),plan).andExpect(status().isOk());jdbc.update("UPDATE auto_invest_plan SET status=2 WHERE user_id=?",u.id);
        save(u,key(),plan).andExpect(jsonPath("$.data.status").value("PAUSED"));
    }
    @Test void planRequiresKeyAndValidFundCount() throws Exception {
        var u=login("INVESTOR");
        mvc.perform(put("/api/v1/auto-invest-plans/current").session(u.session).header("X-CSRF-Token",u.csrf).contentType("application/json").content(plan)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("COMMON_MISSING_IDEMPOTENCY_KEY"));
        save(u,"short",plan).andExpect(status().isBadRequest());
        save(u,key(),"{\"monthlyAmount\":\"300.00\",\"executeDay\":8,\"funds\":[]}").andExpect(status().isBadRequest());
        var other=login("INVESTOR");String key=key();save(u,key,plan).andExpect(status().isOk());save(other,key,plan).andExpect(status().isConflict());
    }
    private record Login(MockHttpSession session,String csrf,long id) {}
    private Login login(String role) throws Exception {
        String username="asset-"+UUID.randomUUID();
        mvc.perform(post("/api/v1/auth/registrations").contentType("application/json").content("{\"username\":\""+username+"\",\"password\":\"password123\",\"displayName\":\"测试\",\"role\":\""+role+"\"}")).andExpect(status().isCreated());
        var result=mvc.perform(post("/api/v1/auth/sessions").contentType("application/json").content("{\"username\":\""+username+"\",\"password\":\"password123\"}")).andExpect(status().isOk()).andReturn();
        String body=result.getResponse().getContentAsString();Number id=JsonPath.read(body,"$.data.user.id");
        return new Login((MockHttpSession)result.getRequest().getSession(),JsonPath.read(body,"$.data.csrfToken"),id.longValue());
    }
}
