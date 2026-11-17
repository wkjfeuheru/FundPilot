package com.jason.fund;

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
import java.time.LocalDate;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @Testcontainers
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class FundIT {
    @Container @ServiceConnection static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.0")
        .withDatabaseName("tougu_platform").withUrlParam("connectionTimeZone", "UTC");
    @Container static final GenericContainer<?> REDIS = new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r) {
        r.add("spring.data.redis.host", REDIS::getHost); r.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
    }
    @BeforeAll static void schema(@Autowired DataSource ds) {
        new ResourceDatabasePopulator(new FileSystemResource("../scripts/sql/schema.sql")).execute(ds);
    }
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @BeforeEach void funds() {
        jdbc.update("DELETE FROM favorite"); jdbc.update("DELETE FROM fund_nav"); jdbc.update("DELETE FROM fund");
        jdbc.update("INSERT INTO fund(id,fund_code,name,fund_type,risk_level,category_label,latest_nav,latest_nav_date,return_1y,data_source) VALUES (101,'000311','指数测试',1,4,'指数型-股票',0.9000,'2026-11-13',12.3400,'EASTMONEY'),(102,'000198','货币测试',3,1,'货币型',1,'2026-11-13',0,'EASTMONEY'),(103,'999999','已删除',2,2,'债券',1,'2026-11-13',0,'DEMO')");
        jdbc.update("UPDATE fund SET deleted_at=UTC_TIMESTAMP(3) WHERE id=103");
        jdbc.update("INSERT INTO fund_nav(fund_id,nav_date,unit_nav,accum_nav,per_10k_income,annualized_7d) VALUES (101,'2026-11-11',1,1,0,0),(101,'2026-11-12',1.2,1.2,0,0),(101,'2026-11-13',0.9,0.9,0,0),(102,'2026-11-13',1,0,0.215,0.797)");
    }
    @Test void listFiltersAndSerializesDecimalsWithoutLeakingDeletedFunds() throws Exception {
        var user=login("INVESTOR");
        mvc.perform(get("/api/v1/funds").session(user.session)).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.total").value(2)).andExpect(jsonPath("$.data.items[0].fundCode").value("000311"))
            .andExpect(jsonPath("$.data.items[0].return1y").value("12.3400"))
            .andExpect(jsonPath("$.data.items[1].annualized7d").value("0.7970"));
        mvc.perform(get("/api/v1/funds?fundType=MONEY&riskLevel=R1&keyword=000").session(user.session))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.total").value(1));
        mvc.perform(get("/api/v1/funds?keyword=%25").session(user.session)).andExpect(jsonPath("$.data.total").value(0));
    }
    @Test void favoriteIsIdempotentPersistentAndScopedToUser() throws Exception {
        var a=login("INVESTOR"); var b=login("INVESTOR");
        mvc.perform(put("/api/v1/favorites/101").session(a.session)).andExpect(status().isForbidden());
        for(int i=0;i<2;i++) mvc.perform(put("/api/v1/favorites/101").session(a.session).header("X-CSRF-Token",a.csrf))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.isFavorite").value(true));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM favorite",Integer.class)).isEqualTo(1);
        mvc.perform(get("/api/v1/favorites").session(a.session)).andExpect(jsonPath("$.data.total").value(1));
        mvc.perform(get("/api/v1/favorites").session(b.session)).andExpect(jsonPath("$.data.total").value(0));
        mvc.perform(get("/api/v1/funds/101").session(a.session)).andExpect(jsonPath("$.data.isFavorite").value(true));
        for(int i=0;i<2;i++) mvc.perform(delete("/api/v1/favorites/101").session(a.session).header("X-CSRF-Token",a.csrf)).andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM favorite",Integer.class)).isZero();
    }
    @Test void rolesAndMissingResourcesAreEnforced() throws Exception {
        mvc.perform(get("/api/v1/funds")).andExpect(status().isUnauthorized());
        var advisor=login("ADVISOR");
        mvc.perform(get("/api/v1/funds").session(advisor.session)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/funds/101").session(advisor.session)).andExpect(status().isOk()).andExpect(jsonPath("$.data.isFavorite").value(false));
        mvc.perform(put("/api/v1/favorites/101").session(advisor.session).header("X-CSRF-Token",advisor.csrf)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/funds/103").session(advisor.session)).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("FUND_NOT_FOUND"));
    }
    @Test void detailsCalculateRiskAndDiscloseInsufficientData() throws Exception {
        var user=login("INVESTOR");
        mvc.perform(get("/api/v1/funds/101").session(user.session)).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.riskMetrics.maxDrawdown").value("-25.0000"))
            .andExpect(jsonPath("$.data.riskMetrics.annualizedVolatility").value("505.1237"))
            .andExpect(jsonPath("$.data.dataSource").value("EASTMONEY"));
        mvc.perform(get("/api/v1/funds/102").session(user.session)).andExpect(jsonPath("$.data.riskMetrics.maxDrawdown").value("0.0000"));
        jdbc.update("DELETE FROM fund_nav WHERE fund_id=101 AND nav_date<'2026-11-13'");
        mvc.perform(get("/api/v1/funds/101").session(user.session)).andExpect(jsonPath("$.data.riskMetrics.annualizedVolatility").isEmpty());
    }
    @Test void missingMoneyIncomeIsNotReportedAsZero() throws Exception {
        var user=login("INVESTOR");
        jdbc.update("DELETE FROM fund_nav WHERE fund_id=102");
        mvc.perform(get("/api/v1/funds/102").session(user.session)).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.annualized7d").isEmpty()).andExpect(jsonPath("$.data.per10kIncome").isEmpty());
    }
    @Test void navsPreserveChronologyAndEndpointsWithinLimit() throws Exception {
        var user=login("INVESTOR");
        jdbc.update("DELETE FROM fund_nav WHERE fund_id=101");
        var start=LocalDate.of(2025,11,14);
        jdbc.batchUpdate("INSERT INTO fund_nav(fund_id,nav_date,unit_nav) VALUES (101,?,1)",
            java.util.stream.IntStream.range(0,365).mapToObj(i -> new Object[]{start.plusDays(i)}).toList());
        mvc.perform(get("/api/v1/funds/101/navs").session(user.session)).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.points.length()").value(250))
            .andExpect(jsonPath("$.data.points[0].navDate").value("2025-11-14"))
            .andExpect(jsonPath("$.data.points[249].navDate").value("2026-11-13"));
        mvc.perform(get("/api/v1/funds/101/navs?from=2026-11-12&to=2026-11-13").session(user.session))
            .andExpect(jsonPath("$.data.points.length()").value(2));
    }
    @Test void invalidQueriesAreBadRequestsNotServerErrors() throws Exception {
        var user=login("INVESTOR");
        for(String path: new String[]{"/funds?fundType=ALIEN","/funds?riskLevel=R9","/funds/-1","/funds/abc","/funds/101/navs?range=ALL","/funds/101/navs?from=bad","/funds/101/navs?from=2026-02-01&to=2026-01-01","/funds/101/navs?from=2026-01-01"}) {
            mvc.perform(get("/api/v1"+path).session(user.session)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("COMMON_VALIDATION_FAILED"));
        }
    }
    @Test void suitabilityShowsMissingExpiredAndEffectiveProfiles() throws Exception {
        var user=login("INVESTOR");
        mvc.perform(get("/api/v1/risk-profiles/current").session(user.session)).andExpect(status().isNotFound());
        jdbc.update("INSERT INTO risk_profile(user_id,risk_level,valid_until) VALUES (?,3,'2020-01-01')",user.id);
        mvc.perform(get("/api/v1/risk-profiles/current").session(user.session)).andExpect(status().isOk()).andExpect(jsonPath("$.data.isEffective").value(false));
        jdbc.update("UPDATE risk_profile SET valid_until='2099-01-01' WHERE user_id=?",user.id);
        mvc.perform(get("/api/v1/risk-profiles/current").session(user.session)).andExpect(jsonPath("$.data.isEffective").value(true));
    }
    private record Login(MockHttpSession session,String csrf,long id) {}
    private Login login(String role) throws Exception {
        String username="fund-"+UUID.randomUUID();
        mvc.perform(post("/api/v1/auth/registrations").contentType("application/json").content("{\"username\":\""+username+"\",\"password\":\"password123\",\"displayName\":\"测试\",\"role\":\""+role+"\"}")).andExpect(status().isCreated());
        var result=mvc.perform(post("/api/v1/auth/sessions").contentType("application/json").content("{\"username\":\""+username+"\",\"password\":\"password123\"}")).andExpect(status().isOk()).andReturn();
        String body=result.getResponse().getContentAsString();
        Number id=JsonPath.read(body,"$.data.user.id");
        return new Login((MockHttpSession)result.getRequest().getSession(),JsonPath.read(body,"$.data.csrfToken"),id.longValue());
    }
}
