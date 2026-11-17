package com.jason.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 单测：standaloneSetup 不加载 Spring 上下文，
 * 规避 Hikari initialization-fail-timeout=1 对数据库的启动期强依赖。
 */
class PingControllerTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new PingController()).build();
    }

    @Test
    void pingShouldReturnSuccessWrapper() throws Exception {
        mockMvc.perform(get("/api/v1/ping"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                // 时间字段为 ISO 8601 UTC，以 Z 结尾（Instant 序列化口径）
                .andExpect(jsonPath("$.data").value(org.hamcrest.Matchers.matchesRegex("\\d{4}-\\d{2}-\\d{2}T.*Z$")));
    }
}
