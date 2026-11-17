package com.jason.trade.service;
import com.jason.trade.dto.*;
import com.jason.platform.service.WriteReplay.Reply;
public interface IReceiptService {
    ReceiptPreview preview(long userId,long orderId);
    Reply<TradeOrderDetail> confirm(long userId,long orderId,String key,ReceiptCommand command,String traceId);
}
