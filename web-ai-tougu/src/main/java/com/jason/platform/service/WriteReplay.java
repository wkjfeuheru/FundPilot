package com.jason.platform.service;
import com.jason.common.ResponseDTO;
import com.jason.trade.mapper.TradeMapper;
import com.jason.exception.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.dao.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import tools.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.HexFormat;
/** Caller owns the DB transaction. A committed reservation without a cached result always rejects execution. */
@Service @RequiredArgsConstructor @Slf4j
public class WriteReplay {
    private final TradeMapper mapper;
    private final StringRedisTemplate redis;
    private final ObjectMapper json;
    public record Claim(long id,String cached){public boolean replayed(){return cached!=null;}}
    public record Reply<T>(ResponseDTO<T> response,boolean replayed){}
    public Claim claim(String key,long userId,String path,Object request){
        if(key==null)throw new BusinessException(ErrorCode.COMMON_MISSING_IDEMPOTENCY_KEY);
        if(!key.matches("[A-Za-z0-9_-]{16,64}"))throw new BusinessException(ErrorCode.COMMON_INVALID_IDEMPOTENCY_KEY);
        String digest=hash(json.writeValueAsString(request));boolean fresh=true;
        try{mapper.claim(key,userId,path,digest);}catch(DuplicateKeyException ex){fresh=false;}
        var row=mapper.key(key);
        if(fresh)return new Claim(row.getId(),null);
        if(row.getUserId()!=userId || !row.getRequestPath().equals(path) || !row.getRequestDigest().equals(digest))throw conflict();
        String cached=null;
        try{cached=redis.opsForValue().get(cacheKey(row.getId()));}catch(DataAccessException ex){log.warn("Write replay cache unavailable");}
        if(cached==null || !hash(cached).equals(row.getResponseDigest()))throw conflict();
        return new Claim(row.getId(),cached);
    }
    public <T> Reply<T> read(Claim claim,Class<T> type){
        return new Reply<>(json.readValue(claim.cached(),json.getTypeFactory().constructParametricType(ResponseDTO.class,type)),true);
    }
    public <T> Reply<T> complete(long id,T value,Duration ttl){
        var response=ResponseDTO.success(value);String encoded=json.writeValueAsString(response);
        mapper.responseDigest(id,hash(encoded));
        try{redis.opsForValue().set(cacheKey(id),encoded,ttl);}catch(DataAccessException ex){log.warn("Replay cache unavailable; DB reservation prevents duplicate writes");}
        return new Reply<>(response,false);
    }
    private String cacheKey(long id){return "fundpilot:ta:response:"+id;}
    public static String hash(String value){
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}
        catch(NoSuchAlgorithmException ex){throw new IllegalStateException(ex);}
    }
    private BusinessException conflict(){return new BusinessException(ErrorCode.COMMON_IDEMPOTENCY_CONFLICT,"凭证已用于不同请求或结果无法回放，请核对回执与订单状态");}
}
