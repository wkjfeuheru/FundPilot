package com.jason.trade.service;
import com.jason.common.*;
import com.jason.trade.dto.*;
import com.jason.trade.model.*;
import com.jason.trade.mapper.TradeMapper;
import com.jason.fund.mapper.FundMapper;
import com.jason.user.mapper.RiskProfileMapper;
import com.jason.platform.service.*;
import com.jason.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import tools.jackson.databind.ObjectMapper;
import java.math.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class TradeServiceImpl implements ITradeService {
    private final TradeMapper mapper;
    private final TradeOrderReader reader;
    private final FundMapper funds;
    private final RiskProfileMapper profiles;
    private final TradingCalendar calendar;
    private final PurchaseReplayCache cache;
    private final ObjectMapper json;
    private static final String PATH="POST /api/v1/trade-orders/purchases";
    @Override public PurchaseQuote quote(long userId,PurchaseRequest request){
        BigDecimal amount=new BigDecimal(request.amount());
        if(amount.compareTo(new BigDecimal("100.00"))<0)throw new BusinessException(ErrorCode.TRADE_AMOUNT_BELOW_MIN);
        var fund=funds.find(request.fundId(),userId);
        if(fund==null)throw new BusinessException(ErrorCode.FUND_NOT_FOUND);
        if(fund.getLatestNav()==null || fund.getLatestNav().signum()<=0)
            throw new BusinessException(ErrorCode.CONFLICT,"基金尚无有效参考净值，暂不能申购");
        if(fund.getFeePurchase().signum()<0 || fund.getFeePurchase().compareTo(new BigDecimal("100"))>=0)
            throw new BusinessException(ErrorCode.CONFLICT,"基金费率异常，暂不能申购");
        var cash=cash(userId);
        var profile=profiles.find(userId);
        var today=calendar.businessDate();
        var tradeDate=calendar.nextOrSame(today);
        boolean effective=profile!=null && !profile.getValidUntil().isBefore(today);
        boolean risk=effective && fund.getRiskLevel()>profile.getRiskLevel();
        List<String> warnings=new ArrayList<>();
        if(!tradeDate.equals(fund.getLatestNavDate()))warnings.add("净值为最近披露口径，实际份额以 TA 确认的 T 日净值为准");
        if(!effective)warnings.add("尚未完成有效风险测评，建议先测评");
        if(fund.getPurchaseStatus()!=1)warnings.add("基金"+(fund.getPurchaseStatus()==2?"限购":"暂停申购")+"，TA 可能确认失败");
        if(amount.compareTo(new BigDecimal(cash.availableCash()))>0)warnings.add("可用现金不足，提交前请核对资金");
        BigDecimal fee=amount.multiply(fund.getFeePurchase()).divide(new BigDecimal("100"),2,RoundingMode.HALF_UP);
        return new PurchaseQuote(fund.getId(),fund.getFundCode(),fund.getName(),"R"+fund.getRiskLevel(),
            List.of("OPEN","LIMITED","SUSPENDED").get(fund.getPurchaseStatus()-1),fund.getRedeemStatus()==1?"OPEN":"SUSPENDED",
            fund.getLatestNavDate(),decimal(fund.getLatestNav(),4),decimal(amount,2),decimal(fund.getFeePurchase(),4),decimal(fee,2),
            amount.subtract(fee).divide(fund.getLatestNav(),4,RoundingMode.HALF_UP).toPlainString(),cash.availableCash(),risk,List.copyOf(warnings));
    }
    @Override @Transactional(isolation=Isolation.READ_COMMITTED)
    public Submission purchase(long userId,String key,PurchaseRequest request,String traceId){
        if(key==null)throw new BusinessException(ErrorCode.COMMON_MISSING_IDEMPOTENCY_KEY);
        if(!key.matches("[A-Za-z0-9_-]{16,64}"))throw new BusinessException(ErrorCode.COMMON_INVALID_IDEMPOTENCY_KEY);
        String digest=sha256(json.writeValueAsString(request));
        boolean fresh=true;
        try{mapper.claim(key,userId,PATH,digest);}catch(DuplicateKeyException ex){fresh=false;}
        // Unique-key insertion waits for a competing transaction; only committed responses are replayed.
        PurchaseKeyRow claimed=mapper.key(key);
        if(!fresh){
            if(claimed.getUserId()!=userId || !PATH.equals(claimed.getRequestPath()) || !digest.equals(claimed.getRequestDigest()))throw conflict();
            String cached=cache.get(claimed.getId());
            if(cached==null || !sha256(cached).equals(claimed.getResponseDigest()))throw conflict();
            var type=json.getTypeFactory().constructParametricType(ResponseDTO.class,TradeOrderDetail.class);
            return new Submission(json.readValue(cached,type),true);
        }
        // Every cash-changing transaction must take this same row lock before computing pending freezes.
        if(mapper.lockCash(userId)==null)throw new BusinessException(ErrorCode.NOT_FOUND,"资金账户未初始化");
        PurchaseQuote quote=quote(userId,request);
        BigDecimal amount=new BigDecimal(request.amount());
        if(amount.compareTo(new BigDecimal(quote.availableCash()))>0)throw new BusinessException(ErrorCode.TRADE_AVAILABLE_CASH_INSUFFICIENT);
        if(quote.riskAcknowledgmentRequired() && !request.riskAcknowledged())throw new BusinessException(ErrorCode.TRADE_RISK_ACKNOWLEDGEMENT_REQUIRED);
        OrderRow order=new OrderRow();
        order.setUserId(userId);order.setTradeDate(calendar.nextOrSame(calendar.businessDate()));
        order.setOrderCode("N"+UUID.randomUUID().toString().replace("-","").substring(0,19));
        order.setTotalAmountIn(amount);order.setTotalFee(new BigDecimal(quote.feeAmount()));order.setFreezeAmount(amount);
        order.setRemark(String.join("；",quote.warnings()));
        mapper.insertOrder(order);
        String code=OrderCodeGenerator.trade(order.getTradeDate(),order.getId());
        mapper.setOrderCode(order.getId(),code);
        mapper.insertItem(order.getId(),request.fundId(),amount,new BigDecimal(quote.feeAmount()));
        mapper.audit(userId,order.getId(),code,json.writeValueAsString(Map.of("fundId",request.fundId(),"amount",request.amount(),
            "riskAcknowledged",request.riskAcknowledged(),"riskAcknowledgmentRequired",quote.riskAcknowledgmentRequired(),"status","PENDING_TA","warnings",quote.warnings())),traceId);
        var response=ResponseDTO.success(detail(userId,order.getId()));
        String encoded=json.writeValueAsString(response);
        mapper.responseDigest(claimed.getId(),sha256(encoded));
        // Save before releasing the unique-key lock; orphan cache entries are never trusted without a committed DB digest.
        cache.put(claimed.getId(),encoded);
        return new Submission(response,false);
    }
    @Override public CashAccount cash(long userId){
        var row=mapper.cash(userId);
        if(row==null)throw new BusinessException(ErrorCode.NOT_FOUND,"资金账户未初始化");
        return new CashAccount(userId,decimal(row.getCashBalance(),2),decimal(row.getFrozenAmount(),2),
            decimal(row.getCashBalance().subtract(row.getFrozenAmount()),2),row.getUpdatedAt());
    }
    @Override @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public PageResponse<TradeOrderSummary> orders(long userId,TradeQuery query){
        if(query.from()!=null && query.to()!=null && query.from().isAfter(query.to()))throw new BusinessException(ErrorCode.INVALID_REQUEST,"开始日期不得晚于结束日期");
        var rows=mapper.orders(userId,query);long total=mapper.count(userId,query);
        if(rows.isEmpty())return new PageResponse<>(List.of(),total,query.pageNumber(),query.pageSize());
        return new PageResponse<>(reader.summaries(rows),total,query.pageNumber(),query.pageSize());
    }
    @Override @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public TradeOrderDetail detail(long userId,long orderId){return reader.detail(userId,orderId);}
    private BusinessException conflict(){return new BusinessException(ErrorCode.COMMON_IDEMPOTENCY_CONFLICT,"幂等键已用于不同请求，或首次响应无法回放；请先核对交易记录");}
    private static String decimal(BigDecimal value,int scale){return value.setScale(scale,RoundingMode.HALF_UP).toPlainString();}
    private static String sha256(String value){
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}
        catch(NoSuchAlgorithmException ex){throw new IllegalStateException(ex);}
    }
}
