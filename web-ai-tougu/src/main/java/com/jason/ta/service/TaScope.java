package com.jason.ta.service;
import com.jason.ta.mapper.TaMapper;
import com.jason.exception.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
@Service public class TaScope {
    private final long userId;private final boolean enabled;private final TaMapper mapper;
    public TaScope(TaMapper mapper,@Value("${app.ta.demo-user-id:0}") long userId,@Value("${app.ta.enabled:false}") boolean enabled){this.mapper=mapper;this.userId=userId;this.enabled=enabled;}
    public long userId(){
        if(!enabled)throw new BusinessException(ErrorCode.TA_DISABLED);
        if(userId<=0 || mapper.customerName(userId)==null)throw new BusinessException(ErrorCode.NOT_FOUND,"TA 固定演示投资者未配置或不可用");
        return userId;
    }
}
