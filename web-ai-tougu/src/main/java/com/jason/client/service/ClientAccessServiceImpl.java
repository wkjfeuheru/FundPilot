package com.jason.client.service;
import com.jason.client.mapper.ClientAccessMapper;
import com.jason.exception.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
@Service @RequiredArgsConstructor
public class ClientAccessServiceImpl implements IClientAccessService {
    private static final Logger log=LoggerFactory.getLogger(ClientAccessServiceImpl.class);
    private final ClientAccessMapper mapper;
    @Override public void assertAssigned(long advisorUserId,long customerId) {
        if(mapper.countActive(advisorUserId,customerId)==0) {
            log.warn("客户范围访问被拒绝 advisorId={} customerId={}",advisorUserId,customerId);
            throw new BusinessException(ErrorCode.CLIENT_NOT_ASSIGNED);
        }
    }
}
