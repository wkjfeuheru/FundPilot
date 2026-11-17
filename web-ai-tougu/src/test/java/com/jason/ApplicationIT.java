package com.jason;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.mysql.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 集成测试（Failsafe，*IT 命名）：Testcontainers MySQL，
 * 验证上下文能带真实数据源启动 + ping 冒烟。骨架阶段不灌 schema。
 * Boot 4 适配：@AutoConfigureMockMvc 移至 spring-boot-webmvc-test；
 * TC 2.0 的 MySQLContainer 移至 org.testcontainers.mysql 且为非泛型类。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@TestPropertySource(properties = {
        // 骨架阶段禁用 Redis 会话后端，默认 Tomcat 会话即可，避免 IT 依赖 Redis 实例
        "spring.session.store-type=none"
})
class ApplicationIT {

    @Container
    @ServiceConnection
    static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.0");

    @Autowired
    MockMvc mockMvc;

    @Test
    void contextLoadsWithDatasourceAndPingWorks() throws Exception {
        mockMvc.perform(get("/api/v1/ping"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data").isNotEmpty());
    }
}
