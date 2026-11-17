package com.jason.common;

import java.time.Instant;

/**
 * 统一成功/业务响应包装（CLAUDE.md：成功响应统一 ResponseEntity&lt;ResponseDTO&lt;T&gt;&gt;）。
 * 时间字段统一 Instant，序列化为 ISO 8601 UTC。
 */
public record ResponseDTO<T>(int code, String message, T data, Instant timestamp) {

    private static final int SUCCESS_CODE = 0;

    public static ResponseDTO<Void> success() {
        return success(null);
    }

    public static <T> ResponseDTO<T> success(T data) {
        return new ResponseDTO<>(SUCCESS_CODE, "ok", data, Instant.now());
    }

    public static <T> ResponseDTO<T> success(T data, String message) {
        return new ResponseDTO<>(SUCCESS_CODE, message, data, Instant.now());
    }
}
