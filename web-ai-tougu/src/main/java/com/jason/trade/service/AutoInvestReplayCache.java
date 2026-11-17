package com.jason.trade.service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import java.time.Duration;
@Service @RequiredArgsConstructor @Slf4j
public class AutoInvestReplayCache {
    private final StringRedisTemplate redis;
    public String get(long id){
        try{return redis.opsForValue().get(key(id));}
        catch(DataAccessException ex){log.warn("Auto-invest replay cache unavailable");return null;}
    }
    public void put(long id,String body){
        try{redis.opsForValue().set(key(id),body,Duration.ofDays(7));}
        catch(DataAccessException ex){log.warn("Auto-invest committed with database idempotency protection; replay cache unavailable");}
    }
    private String key(long id){return "fundpilot:auto-invest:response:"+id;}
}
