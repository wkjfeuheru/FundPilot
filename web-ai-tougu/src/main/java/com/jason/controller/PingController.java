package com.jason.controller;

import com.jason.common.ResponseDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

/**
 * 冒烟端点：验证 Web/序列化/异常链路装配，不依赖任何业务模块。
 */
@RestController
@RequestMapping("/api/v1")
public class PingController {

    @GetMapping("/ping")
    public ResponseEntity<ResponseDTO<Instant>> ping() {
        return ResponseEntity.ok(ResponseDTO.success(Instant.now()));
    }
}
