package com.jason.auth;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;
import javax.sql.DataSource;
import java.math.BigDecimal;
import java.util.UUID;
import com.jason.auth.config.AuthProperties;
import org.springframework.test.annotation.DirtiesContext;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AuthIT {
    @Container @ServiceConnection
    static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.0").withDatabaseName("tougu_platform")
            .withUrlParam("connectionTimeZone", "UTC");
    @Container
    static final GenericContainer<?> REDIS = new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);
    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.redis.host", REDIS::getHost);
        registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
        registry.add("app.ta.enabled", () -> false);
    }
    @BeforeAll
    static void schema(@Autowired DataSource dataSource) {
        new ResourceDatabasePopulator(new FileSystemResource("../scripts/sql/schema.sql")).execute(dataSource);
    }
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired AuthProperties registrationProperties;

    @Test
    void registrationCanBeDisabledWithoutWritingAnAccount() throws Exception {
        registrationProperties.setEnabled(false);
        String username = name();
        try {
            mvc.perform(post("/api/v1/auth/registrations").contentType("application/json").content(registration(username, "INVESTOR")))
                    .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("AUTH_REGISTRATION_DISABLED"));
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM user WHERE username=?", Integer.class, username)).isZero();
        } finally { registrationProperties.setEnabled(true); }
    }

    @Test
    void failedCashOpeningRollsBackUserCustomerAndAudit() throws Exception {
        String username = name();
        jdbc.execute("ALTER TABLE cash_account ADD CONSTRAINT auth_test_cash_failure CHECK (cash_balance <> 12345.67)");
        registrationProperties.setInvestorDemoCash(new BigDecimal("12345.67"));
        try {
            mvc.perform(post("/api/v1/auth/registrations").contentType("application/json").content(registration(username, "INVESTOR")))
                    .andExpect(status().isServiceUnavailable());
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM user WHERE username=?", Integer.class, username)).isZero();
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_log WHERE object_name=?", Integer.class, username)).isZero();
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM customer c LEFT JOIN user u ON u.id=c.user_id WHERE u.id IS NULL", Integer.class)).isZero();
        } finally {
            registrationProperties.setInvestorDemoCash(new BigDecimal("50000.00"));
            jdbc.execute("ALTER TABLE cash_account DROP CHECK auth_test_cash_failure");
        }
    }

    @Test
    void advisorOnlyReachesAssignedActiveCustomers() throws Exception {
        String advisor = name(); register(advisor, "ADVISOR");
        Number advisorId = jdbc.queryForObject("SELECT id FROM user WHERE username=?", Long.class, advisor);
        Number investorId = JsonPath.read(register(name(), "INVESTOR").getResponse().getContentAsString(), "$.data.userId");
        MockHttpSession session = login(advisor);
        String path = "/api/v1/customers/" + investorId + "/trade-orders";
        mvc.perform(get(path).session(session)).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("CLIENT_NOT_ASSIGNED"));
        String encodedId = investorId.toString().chars().mapToObj(c -> "%" + Integer.toHexString(c)).collect(java.util.stream.Collectors.joining());
        mvc.perform(get(java.net.URI.create("/api/v1/customers/" + encodedId + "/trade-orders")).session(session)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/customers/+" + investorId + "/trade-orders").session(session)).andExpect(status().isBadRequest());
        jdbc.update("INSERT INTO advisor_customer_relation(advisor_user_id,customer_user_id,assigned_at) VALUES(?,?,UTC_TIMESTAMP(3))", advisorId, investorId);
        // The implemented history endpoint is accessible only after the active assignment is established.
        mvc.perform(get(path).session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.data.content").isEmpty());
        jdbc.update("UPDATE advisor_customer_relation SET status=2 WHERE advisor_user_id=?", advisorId);
        mvc.perform(get(path).session(session)).andExpect(status().isForbidden());
    }

    @Test
    void unicodePasswordsSupportTheFull64CharacterContract() throws Exception {
        String username = name();
        String password = "密".repeat(64);
        mvc.perform(post("/api/v1/auth/registrations").contentType("application/json")
                .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\",\"displayName\":\"测试\",\"role\":\"INVESTOR\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/auth/sessions").contentType("application/json").content(credentials(username,password))).andExpect(status().isOk());
    }

    @Test
    void investorRegistrationAtomicallyOpensAccountWithoutLoggingIn() throws Exception {
        String name = name();
        MvcResult result = register(name, "INVESTOR");
        Number id = JsonPath.read(result.getResponse().getContentAsString(), "$.data.userId");
        assertThat(result.getRequest().getSession(false)).isNull();
        assertThat((String) JsonPath.read(result.getResponse().getContentAsString(), "$.data.initialCash")).isEqualTo("50000.00");
        assertThat(jdbc.queryForObject("SELECT cash_balance FROM cash_account WHERE user_id=?", BigDecimal.class, id)).isEqualByComparingTo("50000.00");
        assertThat(count("customer", id)).isEqualTo(1);
        assertThat(count("risk_profile", id)).isZero();
        String hash = jdbc.queryForObject("SELECT password_hash FROM user WHERE id=?", String.class, id);
        assertThat(hash).startsWith("$argon2id$").doesNotContain("Password123");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_log WHERE actor_user_id=? AND action=8", Integer.class, id)).isEqualTo(1);
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
    }

    @Test
    void advisorRegistrationDoesNotCreateInvestorRecordsAndUsernameIsNeverReused() throws Exception {
        String name = name();
        Number id = JsonPath.read(register(name, "ADVISOR").getResponse().getContentAsString(), "$.data.userId");
        assertThat(count("customer", id)).isZero();
        assertThat(count("cash_account", id)).isZero();
        jdbc.update("UPDATE user SET deleted_at=CURRENT_TIMESTAMP(3) WHERE id=?", id);
        mvc.perform(post("/api/v1/auth/registrations").contentType("application/json").content(registration(name, "ADVISOR")))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("AUTH_USERNAME_TAKEN"));
        mvc.perform(post("/api/v1/auth/sessions").contentType("application/json").content(credentials(name, "Password123")))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("AUTH_INVALID_CREDENTIALS"));
    }

    @Test
    void loginRotatesSessionAndCsrfAndLogoutInvalidatesBoth() throws Exception {
        String name = name(); register(name, "INVESTOR");
        MvcResult anonymous = mvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
        MockHttpSession session = (MockHttpSession) anonymous.getRequest().getSession(false);
        String oldId = session.getId();
        String oldToken = JsonPath.read(anonymous.getResponse().getContentAsString(), "$.data.token");
        MvcResult login = mvc.perform(post("/api/v1/auth/sessions").session(session).contentType("application/json").content(credentials(name, "Password123")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.csrfHeaderName").value("X-CSRF-Token")).andReturn();
        assertThat(session.getId()).isNotEqualTo(oldId);
        String token = JsonPath.read(login.getResponse().getContentAsString(), "$.data.csrfToken");
        assertThat(token).isNotEqualTo(oldToken);
        mvc.perform(get("/api/v1/auth/me").session(session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value(name)).andExpect(jsonPath("$.data.riskLevel").isEmpty());
        mvc.perform(delete("/api/v1/auth/sessions/current").session(session).header("X-CSRF-Token", oldToken))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("AUTH_CSRF_INVALID"));
        mvc.perform(delete("/api/v1/auth/sessions/current").session(session).header("X-CSRF-Token", token)).andExpect(status().isNoContent());
        assertThat(session.isInvalid()).isTrue();
        mvc.perform(delete("/api/v1/auth/sessions/current")).andExpect(status().isNoContent());
    }

    @Test
    void rolesAreEnforcedOnServerAndDisabledAccountsLoseExistingSessions() throws Exception {
        String investor = name(); register(investor, "INVESTOR");
        MockHttpSession session = login(investor);
        mvc.perform(get("/api/v1/customers").session(session)).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("COMMON_FORBIDDEN"));
        mvc.perform(get("/api/v1/strategies").session(session)).andExpect(status().isForbidden());
        jdbc.update("UPDATE user SET status=2 WHERE username=?", investor);
        mvc.perform(get("/api/v1/auth/me").session(session)).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("AUTH_ACCOUNT_DISABLED"));
        assertThat(session.isInvalid()).isTrue();
        String advisor = name(); register(advisor, "ADVISOR");
        mvc.perform(get("/api/v1/holdings").session(login(advisor))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/holdings")).andExpect(status().isUnauthorized());
    }

    @Test
    void repeatedFailuresLockOnlyTheUsernameAndIpPair() throws Exception {
        String name = name(); register(name, "INVESTOR");
        for (int i = 0; i < 4; i++) {
            mvc.perform(post("/api/v1/auth/sessions").contentType("application/json").content(credentials(name, "Incorrect123")))
                    .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("AUTH_INVALID_CREDENTIALS"));
        }
        mvc.perform(post("/api/v1/auth/sessions").contentType("application/json").content(credentials(name, "Incorrect123")))
                .andExpect(status().isTooManyRequests()).andExpect(jsonPath("$.code").value("AUTH_LOGIN_RATE_LIMITED"));
        mvc.perform(post("/api/v1/auth/sessions").contentType("application/json").content(credentials(name, "Password123")))
                .andExpect(status().isTooManyRequests());
        mvc.perform(post("/api/v1/auth/sessions").with(request -> { request.setRemoteAddr("192.0.2.11"); return request; })
                        .contentType("application/json").content(credentials(name, "Password123"))).andExpect(status().isOk());
    }

    @Test
    void equivalentDatabaseUsernamesCannotBypassTheFailureLimit() throws Exception {
        String suffix = name();
        String username = "straße_" + suffix;
        String alias = "strasse_" + suffix;
        register(username, "INVESTOR");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM user WHERE username=?", Integer.class, alias)).isEqualTo(1);
        for (int i = 0; i < 4; i++) {
            mvc.perform(post("/api/v1/auth/sessions").contentType("application/json").content(credentials(username, "Incorrect123"))).andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/v1/auth/sessions").contentType("application/json").content(credentials(alias, "Incorrect123")))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void invalidInputHasContractErrorsWithoutLeakingPasswords() throws Exception {
        mvc.perform(post("/api/v1/auth/registrations").contentType("application/json").content(registration(name(), "ADMIN")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("AUTH_ROLE_INVALID"));
        String response = mvc.perform(post("/api/v1/auth/registrations").contentType("application/json")
                        .content("{\"username\":\"\",\"password\":\"secret\",\"displayName\":\"\",\"role\":\"INVESTOR\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("COMMON_VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors").isArray()).andReturn().getResponse().getContentAsString();
        assertThat(response).doesNotContain("secret");
        mvc.perform(post("/api/v1/auth/sessions").contentType("application/json").content("{"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("COMMON_MALFORMED_REQUEST"));
    }

    @Test
    void taDisabledAndInternalToolsCannotUseBrowserSessions() throws Exception {
        mvc.perform(get("/api/v1/ta/summary")).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("TA_DISABLED"));
        String name = name(); register(name, "ADVISOR");
        mvc.perform(post("/api/v1/agent/tools/portfolio-diagnoses").session(login(name)).contentType("application/json").content("{}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("AUTH_INTERNAL_TOKEN_INVALID"));
    }

    private MvcResult register(String username, String role) throws Exception {
        return mvc.perform(post("/api/v1/auth/registrations").contentType("application/json").content(registration(username, role)))
                .andExpect(status().isCreated()).andReturn();
    }
    private MockHttpSession login(String username) throws Exception {
        return (MockHttpSession) mvc.perform(post("/api/v1/auth/sessions").contentType("application/json").content(credentials(username, "Password123")))
                .andExpect(status().isOk()).andReturn().getRequest().getSession(false);
    }
    private int count(String table, Number id) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE user_id=?", Integer.class, id);
    }
    private static String name() { return "auth_" + UUID.randomUUID().toString().replace("-", ""); }
    private static String credentials(String name, String password) { return "{\"username\":\"" + name + "\",\"password\":\"" + password + "\"}"; }
    private static String registration(String name, String role) { return "{\"username\":\"" + name + "\",\"password\":\"Password123\",\"displayName\":\"测试账号\",\"role\":\"" + role + "\"}"; }
}
