package com.jason.auth;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.io.FileSystemResource;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;
import javax.sql.DataSource;
import java.net.*;
import java.net.http.*;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties="app.session.backend=redis")
@Testcontainers @DirtiesContext(classMode=DirtiesContext.ClassMode.AFTER_CLASS)
class RedisSessionIT {
    @Container @ServiceConnection
    static final MySQLContainer MYSQL=new MySQLContainer("mysql:8.0").withDatabaseName("tougu_platform").withUrlParam("connectionTimeZone","UTC");
    @Container static final GenericContainer<?> REDIS=new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);
    @DynamicPropertySource static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.redis.host",REDIS::getHost);
        registry.add("spring.data.redis.port",() -> REDIS.getMappedPort(6379));
    }
    @BeforeAll static void schema(@Autowired DataSource source) {
        new ResourceDatabasePopulator(new FileSystemResource("../scripts/sql/schema.sql")).execute(source);
    }
    @LocalServerPort int port;
    @Autowired StringRedisTemplate redis;
    @Test void redisBackendPersistsAnHttpOnlyCookieSession() throws Exception {
        var cookies=new CookieManager(null,CookiePolicy.ACCEPT_ALL);
        var client=HttpClient.newBuilder().cookieHandler(cookies).build();
        String root="http://localhost:"+port+"/api/v1/auth";
        var registration=client.send(HttpRequest.newBuilder(URI.create(root+"/registrations")).header("Content-Type","application/json")
            .POST(HttpRequest.BodyPublishers.ofString("{\"username\":\"redis_session_user\",\"password\":\"Password123\",\"displayName\":\"会话测试\",\"role\":\"INVESTOR\"}")).build(),HttpResponse.BodyHandlers.ofString());
        assertThat(registration.statusCode()).isEqualTo(201);
        var login=client.send(HttpRequest.newBuilder(URI.create(root+"/sessions")).header("Content-Type","application/json")
            .POST(HttpRequest.BodyPublishers.ofString("{\"username\":\"redis_session_user\",\"password\":\"Password123\"}")).build(),HttpResponse.BodyHandlers.ofString());
        assertThat(login.statusCode()).isEqualTo(200);
        assertThat(login.headers().allValues("set-cookie").toString()).contains("JSESSIONID","HttpOnly","SameSite=Lax");
        assertThat(redis.keys("fundpilot:sessions:sessions:*")).isNotEmpty();
        var me=client.send(HttpRequest.newBuilder(URI.create(root+"/me")).GET().build(),HttpResponse.BodyHandlers.ofString());
        assertThat(me.statusCode()).isEqualTo(200);
        assertThat(me.body()).contains("redis_session_user");
    }
}
