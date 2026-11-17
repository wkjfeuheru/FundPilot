package com.jason.ta.service;
import com.jason.common.PageResponse;
import com.jason.ta.dto.*;
import com.jason.trade.dto.*;
import com.jason.trade.service.IReceiptService;
import com.jason.platform.service.WriteReplay;
import com.jason.platform.service.WriteReplay.Reply;
import com.jason.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import java.util.*;
@Service @RequiredArgsConstructor
public class TaServiceImpl implements ITaService {
    private final TaScope scope;
    private final TaReadService reads;
    private final IReceiptService receipts;
    private final TaBatchTransactions batches;
    private final WriteReplay replay;
    @Override public TaSummary summary(){return reads.summary(scope.userId());}
    @Override public PageResponse<TaOrderSummary> orders(TaQuery query){return reads.orders(scope.userId(),query);}
    @Override public PageResponse<ReceiptView> receipts(TaQuery query){return reads.receipts(scope.userId(),query);}
    @Override public ReceiptPreview preview(long id){return receipts.preview(scope.userId(),id);}
    @Override public Reply<TradeOrderDetail> confirm(long id,String key,ReceiptCommand request,String traceId){return receipts.confirm(scope.userId(),id,key,request,traceId);}
    @Override public Reply<ReceiptBatchResult> batch(String key,ReceiptBatchRequest request,String traceId){
        long userId=scope.userId();
        var start=batches.start(userId,key,request,traceId);
        if(start.claim().replayed())return replay.read(start.claim(),ReceiptBatchResult.class);
        List<TradeOrderSummary> items=new ArrayList<>();List<ReceiptBatchResult.Failure> failures=new ArrayList<>();
        // Per-order transactions are a domain requirement, not a per-row mapper query loop.
        for(long id:start.ids()){
            String child="ta_"+WriteReplay.hash(key+":"+id).substring(0,60);
            try{
                var detail=receipts.confirm(userId,id,child,new ReceiptCommand("SUCCESS",null),traceId).response().data();
                var summary=new TradeOrderSummary();
                org.springframework.beans.BeanUtils.copyProperties(detail,summary);
                items.add(summary);
            }
            catch(BusinessException ex){failures.add(new ReceiptBatchResult.Failure(id,ex.getErrorCode().getCode(),ex.getMessage()));}
            catch(DataAccessException ex){failures.add(new ReceiptBatchResult.Failure(id,ErrorCode.DATABASE_UNAVAILABLE.getCode(),"该笔处理失败，请核对状态后重试"));}
        }
        return batches.complete(start.claim().id(),new ReceiptBatchResult(start.ids().size(),items.size(),failures,items),traceId);
    }
}
