package com.jason.trade.service;
import com.jason.trade.dto.*;
import com.jason.common.*;
public interface ITradeService {
    record Submission(ResponseDTO<TradeOrderDetail> response,boolean replayed) {}
    PurchaseQuote quote(long userId,PurchaseRequest request);
    Submission purchase(long userId,String key,PurchaseRequest request,String traceId);
    CashAccount cash(long userId);
    PageResponse<TradeOrderSummary> orders(long userId,TradeQuery query);
    TradeOrderDetail detail(long userId,long orderId);
}
