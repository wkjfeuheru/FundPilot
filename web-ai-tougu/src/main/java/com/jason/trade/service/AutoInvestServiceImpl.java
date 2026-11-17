package com.jason.trade.service;
import com.jason.common.ResponseDTO;
import com.jason.trade.dto.*;
import com.jason.trade.mapper.*;
import com.jason.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import tools.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.HexFormat;

@Service @RequiredArgsConstructor public class AutoInvestServiceImpl implements IAutoInvestService {
    private final AutoInvestMapper mapper;
    private final TradeMapper transactions;
    private final AutoInvestReplayCache cache;
    private final ObjectMapper json;
    private static final String PATH="PUT /api/v1/auto-invest-plans/current";
    @Override @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public AutoInvestPlan current(long userId){
        var p=mapper.plan(userId);if(p==null)throw new BusinessException(ErrorCode.NOT_FOUND,"尚未设置定投计划");
        return new AutoInvestPlan(p.getId(),p.getUserId(),p.getMonthlyAmount().setScale(2).toPlainString(),p.getExecuteDay(),p.getStatus()==1?"ACTIVE":"PAUSED",
            mapper.funds(p.getId()).stream().map(f->new AutoInvestPlan.Fund(f.getFundId(),f.getFundCode(),f.getFundName(),f.getMonthlyAmount().setScale(2).toPlainString())).toList(),p.getCreatedAt(),p.getUpdatedAt());
    }
    @Override @Transactional(isolation=Isolation.READ_COMMITTED)
    public Submission save(long userId,String key,AutoInvestRequest request,String traceId){
        if(key==null)throw new BusinessException(ErrorCode.COMMON_MISSING_IDEMPOTENCY_KEY);
        if(!key.matches("[A-Za-z0-9_-]{16,64}"))throw new BusinessException(ErrorCode.COMMON_INVALID_IDEMPOTENCY_KEY);
        String digest=hash(json.writeValueAsString(request));boolean fresh=true;
        try{transactions.claim(key,userId,PATH,digest);}catch(DuplicateKeyException ex){fresh=false;}
        var claim=transactions.key(key);
        if(!fresh){
            if(claim.getUserId()!=userId||!PATH.equals(claim.getRequestPath())||!digest.equals(claim.getRequestDigest()))throw conflict();
            String body=cache.get(claim.getId());if(body==null||!hash(body).equals(claim.getResponseDigest()))throw conflict();
            return new Submission(json.readValue(body,json.getTypeFactory().constructParametricType(ResponseDTO.class,AutoInvestPlan.class)),true);
        }
        var ids=request.funds().stream().map(AutoInvestRequest.Fund::fundId).toList();
        if(ids.stream().distinct().count()!=ids.size())throw new BusinessException(ErrorCode.TRADE_AUTO_INVEST_FUND_DUPLICATED);
        var total=request.funds().stream().map(f->new BigDecimal(f.monthlyAmount())).reduce(BigDecimal.ZERO,BigDecimal::add);
        if(total.compareTo(new BigDecimal(request.monthlyAmount()))!=0)throw new BusinessException(ErrorCode.TRADE_AUTO_INVEST_AMOUNT_MISMATCH);
        if(mapper.countFunds(ids)!=ids.size())throw new BusinessException(ErrorCode.FUND_NOT_FOUND);
        // The persistent account row serializes first creation and later replacement for this user.
        if(transactions.lockCash(userId)==null)throw new BusinessException(ErrorCode.NOT_FOUND,"资金账户未初始化");
        mapper.upsert(userId,request);var plan=mapper.plan(userId);
        mapper.retireFunds(plan.getId());mapper.replaceFunds(plan.getId(),request.funds());
        mapper.audit(userId,plan.getId(),json.writeValueAsString(request),traceId);
        var response=ResponseDTO.success(current(userId));String body=json.writeValueAsString(response);
        transactions.responseDigest(claim.getId(),hash(body));cache.put(claim.getId(),body);
        return new Submission(response,false);
    }
    private BusinessException conflict(){return new BusinessException(ErrorCode.COMMON_IDEMPOTENCY_CONFLICT);}
    private String hash(String body){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(body.getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException ex){throw new IllegalStateException(ex);}}
}
