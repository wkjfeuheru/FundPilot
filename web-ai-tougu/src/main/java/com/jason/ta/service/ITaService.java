package com.jason.ta.service;
import com.jason.common.PageResponse;
import com.jason.ta.dto.*;
import com.jason.trade.dto.*;
import com.jason.platform.service.WriteReplay.Reply;
public interface ITaService {
    TaSummary summary();
    PageResponse<TaOrderSummary> orders(TaQuery query);
    PageResponse<ReceiptView> receipts(TaQuery query);
    ReceiptPreview preview(long id);
    Reply<TradeOrderDetail> confirm(long id,String key,ReceiptCommand command,String traceId);
    Reply<ReceiptBatchResult> batch(String key,ReceiptBatchRequest command,String traceId);
}
