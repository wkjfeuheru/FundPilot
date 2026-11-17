package com.jason.user;

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
class RiskAssessmentIT {
    @org.springframework.boot.test.context.TestConfiguration
    static class FixedTime {
        @org.springframework.context.annotation.Bean @org.springframework.context.annotation.Primary
        java.time.Clock fixedClock() { return java.time.Clock.fixed(java.time.Instant.parse("2026-01-31T16:05:00Z"),java.time.ZoneOffset.UTC); }
    }
    @Autowired org.springframework.data.redis.core.StringRedisTemplate redis;

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

    @BeforeEach void questionnaire() {
        jdbc.update("UPDATE risk_questionnaire SET status=2");
        jdbc.update("INSERT INTO risk_questionnaire(version,title,question_count) VALUES (?,'验收问卷',2)",UUID.randomUUID().toString().substring(0,16));
        questionnaireId=jdbc.queryForObject("SELECT MAX(id) FROM risk_questionnaire",Long.class);
        jdbc.update("INSERT INTO risk_question(questionnaire_id,sort_no,title,options) VALUES (?,2,'第二题','[{\"text\":\"低\",\"score\":0},{\"text\":\"高\",\"score\":10}]'),(?,1,'第一题','[{\"text\":\"低\",\"score\":0},{\"text\":\"边界\",\"score\":4},{\"text\":\"高\",\"score\":10}]')",questionnaireId,questionnaireId);
        questions=jdbc.queryForList("SELECT id FROM risk_question WHERE questionnaire_id=? ORDER BY sort_no",Long.class,questionnaireId);
    }
    long questionnaireId;
    java.util.List<Long> questions;
    String body(int first,int second) {
        return "{\"questionnaireId\":"+questionnaireId+",\"answers\":[{\"questionId\":"+questions.get(0)+",\"optionIndex\":"+first+",\"score\":999},{\"questionId\":"+questions.get(1)+",\"optionIndex\":"+second+"}]}";
    }
    org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder submit(Login user,String key,String body) {
        var request=post("/api/v1/risk-assessments").session(user.session).header("X-CSRF-Token",user.csrf).contentType("application/json").content(body);
        return key==null ? request : request.header("Idempotency-Key",key);
    }
    @Test void questionnaireIsOrderedAndNeverExposesScores() throws Exception {
        var user=login("INVESTOR");
        mvc.perform(get("/api/v1/risk-questionnaires/active").session(user.session)).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.questionCount").value(2)).andExpect(jsonPath("$.data.questions[0].title").value("第一题"))
            .andExpect(jsonPath("$.data.questions[0].options[0].index").value(0)).andExpect(jsonPath("$.data.questions[0].options[0].score").doesNotExist());
    }
    @Test void firstAssessmentScoresOnServerAndReplaysExactlyOnce() throws Exception {
        var user=login("INVESTOR"); String key=UUID.randomUUID().toString();
        mvc.perform(get("/api/v1/risk-profiles/current").session(user.session)).andExpect(status().isNotFound());
        var first=mvc.perform(submit(user,key,body(1,0))).andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.validUntil").value("2027-02-01")).andExpect(jsonPath("$.data.totalScore").value(4)).andExpect(jsonPath("$.data.riskLevel").value("R1"))
            .andExpect(jsonPath("$.data.evaluatedByUserId").isEmpty()).andReturn().getResponse().getContentAsString();
        mvc.perform(submit(user,key,body(1,0))).andExpect(status().isCreated()).andExpect(header().string("Idempotent-Replayed","true"))
            .andExpect(content().json(first));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM risk_assessment WHERE user_id=?",Integer.class,user.id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_log WHERE actor_user_id=? AND action=8 AND object_type='risk_assessment'",Integer.class,user.id)).isEqualTo(1);
        mvc.perform(get("/api/v1/risk-profiles/current").session(user.session)).andExpect(jsonPath("$.data.isEffective").value(true)).andExpect(jsonPath("$.data.riskLevel").value("R1"));
        mvc.perform(submit(user,key,body(2,1))).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("COMMON_IDEMPOTENCY_CONFLICT"));
        var other=login("INVESTOR");
        mvc.perform(submit(other,key,body(1,0))).andExpect(status().isConflict());
    }
    @Test void reassessmentPreservesKycAndUpdatesAuthSummary() throws Exception {
        var user=login("INVESTOR");
        jdbc.update("INSERT INTO risk_profile(user_id,risk_level,account_type,horizon_years,liquidity_need,investment_goal,experience_years) VALUES (?,2,'个人账户',5,2,'长期增值',3)",user.id);
        mvc.perform(submit(user,UUID.randomUUID().toString(),body(0,0))).andExpect(status().isCreated()).andExpect(jsonPath("$.data.riskLevel").value("R1"));
        mvc.perform(submit(user,UUID.randomUUID().toString(),body(2,1))).andExpect(status().isCreated()).andExpect(jsonPath("$.data.riskLevel").value("R5"));
        mvc.perform(get("/api/v1/risk-profiles/current").session(user.session)).andExpect(jsonPath("$.data.accountType").value("个人账户"))
            .andExpect(jsonPath("$.data.horizonYears").value(5)).andExpect(jsonPath("$.data.liquidityNeed").value("MEDIUM"));
        mvc.perform(get("/api/v1/auth/me").session(user.session)).andExpect(jsonPath("$.data.riskLevel").value("R5"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM risk_assessment WHERE user_id=?",Integer.class,user.id)).isEqualTo(2);
    }
    @Test void rejectsIncompleteDuplicateForeignAndInvalidAnswersWithoutWrites() throws Exception {
        var user=login("INVESTOR"); String key=UUID.randomUUID().toString();
        for(String invalid:java.util.List.of("{\"questionnaireId\":"+questionnaireId+",\"answers\":[]}",body(0,0).replace(questions.get(1).toString(),questions.get(0).toString()),body(0,0).replace(questions.get(1).toString(),"999999"))) {
            mvc.perform(submit(user,key,invalid)).andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("USER_RISK_ASSESSMENT_INCOMPLETE"));
        }
        mvc.perform(submit(user,key,body(9,0))).andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("USER_RISK_ANSWER_INVALID"));
        mvc.perform(submit(user,key,body(-1,0))).andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM idempotency_key WHERE idem_key=?",Integer.class,key)).isZero();
        mvc.perform(submit(user,key,body(0,0))).andExpect(status().isCreated());
    }
    @Test void enforcesRolesCsrfAndKeysAndDisabledQuestionnaire() throws Exception {
        mvc.perform(get("/api/v1/risk-questionnaires/active")).andExpect(status().isUnauthorized());
        var advisor=login("ADVISOR");
        mvc.perform(get("/api/v1/risk-questionnaires/active").session(advisor.session)).andExpect(status().isOk());
        mvc.perform(submit(advisor,UUID.randomUUID().toString(),body(0,0))).andExpect(status().isForbidden());
        var user=login("INVESTOR");
        mvc.perform(post("/api/v1/risk-assessments").session(user.session).contentType("application/json").content(body(0,0))).andExpect(status().isForbidden());
        mvc.perform(submit(user,null,body(0,0))).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("COMMON_MISSING_IDEMPOTENCY_KEY"));
        mvc.perform(submit(user,"short",body(0,0))).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("COMMON_INVALID_IDEMPOTENCY_KEY"));
        jdbc.update("UPDATE risk_questionnaire SET status=2");
        mvc.perform(submit(user,UUID.randomUUID().toString(),body(0,0))).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("USER_RISK_QUESTIONNAIRE_NOT_FOUND"));
    }
    @Test void auditFailureRollsBackAllWritesAndAllowsRetry() throws Exception {
        var user=login("INVESTOR"); String key=UUID.randomUUID().toString();
        jdbc.execute("ALTER TABLE audit_log ADD CONSTRAINT reject_risk CHECK (object_type <> 'risk_assessment' OR actor_user_id <> "+user.id+")");
        try { mvc.perform(submit(user,key,body(0,0))).andExpect(status().isServiceUnavailable()); }
        finally { jdbc.execute("ALTER TABLE audit_log DROP CHECK reject_risk"); }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM risk_assessment WHERE user_id=?",Integer.class,user.id)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM risk_profile WHERE user_id=?",Integer.class,user.id)).isZero();
        mvc.perform(submit(user,key,body(0,0))).andExpect(status().isCreated());
    }
    @Test void expiryIncludesShanghaiBusinessDayAndCacheLossNeverDuplicates() throws Exception {
        var user=login("INVESTOR"); String key=UUID.randomUUID().toString();
        mvc.perform(submit(user,key,body(0,0))).andExpect(status().isCreated());
        jdbc.update("UPDATE risk_profile SET valid_until='2026-02-01' WHERE user_id=?",user.id);
        mvc.perform(get("/api/v1/risk-profiles/current").session(user.session)).andExpect(jsonPath("$.data.isEffective").value(true));
        jdbc.update("UPDATE risk_profile SET valid_until='2026-01-31' WHERE user_id=?",user.id);
        mvc.perform(get("/api/v1/risk-profiles/current").session(user.session)).andExpect(jsonPath("$.data.isEffective").value(false));
        redis.delete("fundpilot:risk-assessment:response:"+key);
        mvc.perform(submit(user,key,body(0,0))).andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM risk_assessment WHERE user_id=?",Integer.class,user.id)).isEqualTo(1);
    }
    @Test void concurrentFirstSubmissionsProduceOneProfileAndOneAssessment() throws Exception {
        var user=login("INVESTOR"); String key=UUID.randomUUID().toString();
        try(var pool=java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
            var gate=new java.util.concurrent.CountDownLatch(1);
            var first=pool.submit(() -> { gate.await(); return mvc.perform(submit(user,key,body(0,0))).andReturn().getResponse().getStatus(); });
            var second=pool.submit(() -> { gate.await(); return mvc.perform(submit(user,key,body(0,0))).andReturn().getResponse().getStatus(); });
            gate.countDown();
            assertThat(first.get(20,java.util.concurrent.TimeUnit.SECONDS)).isIn(201,409);
            assertThat(second.get(20,java.util.concurrent.TimeUnit.SECONDS)).isIn(201,409);
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM risk_profile WHERE user_id=?",Integer.class,user.id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM risk_assessment WHERE user_id=?",Integer.class,user.id)).isEqualTo(1);
    }
    @Autowired com.jason.user.service.IRiskAssessmentService riskService;
    @Test void expiredKeysCanBeRemovedWithoutDeletingAssessmentHistory() throws Exception {
        var user=login("INVESTOR"); String key=UUID.randomUUID().toString();
        mvc.perform(submit(user,key,body(0,0))).andExpect(status().isCreated());
        jdbc.update("UPDATE idempotency_key SET expires_at='2026-01-01' WHERE idem_key=?",key);
        riskService.removeExpiredKeys();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM idempotency_key WHERE idem_key=?",Integer.class,key)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM risk_assessment WHERE user_id=?",Integer.class,user.id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_log WHERE actor_user_id=? AND action=8 AND object_type='risk_assessment'",Integer.class,user.id)).isEqualTo(1);
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
