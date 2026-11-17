package com.jason.ta.service;
import com.jason.ta.mapper.TaMapper;
import com.jason.ta.dto.*;
import com.jason.trade.mapper.TradeMapper;
import com.jason.platform.service.WriteReplay;
import com.jason.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.*;
/** Short parent transactions; each settlement runs outside these in its own transaction. */
@Service @RequiredArgsConstructor
public class TaBatchTransactions {
    private final TaMapper mapper;
    private final TradeMapper trades;
    private final WriteReplay replay;
    private final ObjectMapper json;
    public record Start(WriteReplay.Claim claim,List<Long> ids){}
    @Transactional
    public Start start(long userId,String key,ReceiptBatchRequest request,String traceId){
        var claim=replay.claim(key,0,"POST /api/v1/ta/receipt-batches",Map.of("userId",userId,"orderIds",request.orderIds()==null?List.of():request.orderIds(),"result",request.result()));
        if(claim.replayed())return new Start(claim,List.of());
        if(!"SUCCESS".equals(request.result()))throw new BusinessException(ErrorCode.INVALID_REQUEST);
        if(trades.lockCash(userId)==null)throw new BusinessException(ErrorCode.NOT_FOUND);
        List<Long> ids;
        if(request.orderIds()==null)ids=mapper.pendingIds(userId);
        else {
            if(new HashSet<>(request.orderIds()).size()!=request.orderIds().size())throw new BusinessException(ErrorCode.INVALID_REQUEST,"订单不能重复");
            ids=mapper.scopedIds(userId,request.orderIds());
            if(ids.size()!=request.orderIds().size())throw new BusinessException(ErrorCode.TRADE_ORDER_NOT_FOUND);
        }
        if(ids.isEmpty())throw new BusinessException(ErrorCode.TA_BATCH_EMPTY);
        mapper.batchAudit(claim.id(),8,json.writeValueAsString(Map.of("orderIds",ids,"result","SUCCESS")),traceId);
        return new Start(claim,List.copyOf(ids));
    }
    @Transactional
    public WriteReplay.Reply<ReceiptBatchResult> complete(long id,ReceiptBatchResult result,String traceId){
        mapper.batchAudit(id,5,json.writeValueAsString(result),traceId);
        return replay.complete(id,result,result.failed().isEmpty()?Duration.ofDays(7):Duration.ofMinutes(5));
    }
}
