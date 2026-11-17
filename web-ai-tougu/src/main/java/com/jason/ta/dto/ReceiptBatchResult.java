package com.jason.ta.dto;
import com.jason.trade.dto.TradeOrderSummary;
import java.util.List;
public record ReceiptBatchResult(int total,int succeeded,List<Failure> failed,List<TradeOrderSummary> items){
    public record Failure(long orderId,String code,String message){}
}
