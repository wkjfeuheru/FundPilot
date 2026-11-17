package com.jason.auth.service;
import com.jason.auth.config.LoginLimitProperties;
import com.jason.exception.BusinessException;
import com.jason.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.Normalizer;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

@Service @RequiredArgsConstructor
public class LoginRateLimiter {
    private final StringRedisTemplate redis;
    private final LoginLimitProperties properties;
    private static final DefaultRedisScript<Long> FAILURE = new DefaultRedisScript<>("""
        local count = redis.call('INCR', KEYS[1])
        if count == 1 or count == tonumber(ARGV[1]) then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
        return count
        """, Long.class);
    public void check(String username, String ip) {
        try {
            String value = redis.opsForValue().get(key(username, ip));
            if (value != null && Long.parseLong(value) >= properties.getMaxFailures()) throw new BusinessException(ErrorCode.AUTH_LOGIN_RATE_LIMITED);
        } catch (DataAccessException ex) { throw unavailable(ex); }
    }
    public void failed(String username, String ip) {
        try {
            Long count = redis.execute(FAILURE, List.of(key(username, ip)),
                    Integer.toString(properties.getMaxFailures()), Long.toString(properties.getLockSeconds()));
            if (count == null) throw new BusinessException(ErrorCode.AUTH_SERVICE_UNAVAILABLE);
            if (count >= properties.getMaxFailures()) throw new BusinessException(ErrorCode.AUTH_LOGIN_RATE_LIMITED);
        } catch (DataAccessException ex) { throw unavailable(ex); }
    }
    public void succeeded(String username, String ip) {
        try { redis.delete(key(username, ip)); } catch (DataAccessException ex) { throw unavailable(ex); }
    }
    private BusinessException unavailable(DataAccessException cause) {
        return new BusinessException(ErrorCode.AUTH_SERVICE_UNAVAILABLE, "认证服务暂不可用，请稍后重试", cause);
    }
    private String key(String username, String ip) {
        // Match the case/accent-insensitive username collation; never put raw login names into Redis keys.
        String canonical = Normalizer.normalize(username.strip(), Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
        try {
            return "fundpilot:auth:fail:" + HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest((canonical + "\n" + ip).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
}
