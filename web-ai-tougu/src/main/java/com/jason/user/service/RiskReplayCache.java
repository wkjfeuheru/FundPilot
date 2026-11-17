package com.jason.user.service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import java.time.Duration;
@Component @RequiredArgsConstructor @Slf4j
public class RiskReplayCache {
    private final StringRedisTemplate redis;
    private static final String PREFIX="fundpilot:risk-assessment:response:";
    public String get(String key) {
        try { return redis.opsForValue().get(PREFIX+key); }
        catch(DataAccessException e) { log.warn("测评响应缓存不可用，数据库继续防重"); return null; }
    }
    public void put(String key,String response) {
        try { redis.opsForValue().set(PREFIX+key,response,Duration.ofDays(7)); }
        catch(DataAccessException e) { log.warn("测评已提交，响应缓存写入失败，重试由数据库防重"); }
    }
}
