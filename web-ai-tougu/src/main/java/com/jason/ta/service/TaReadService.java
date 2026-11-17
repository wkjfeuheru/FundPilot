package com.jason.ta.service;
import com.jason.ta.mapper.TaMapper;
import com.jason.ta.dto.*;
import com.jason.trade.service.*;
import com.jason.trade.mapper.TradeMapper;
import com.jason.common.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.beans.BeanUtils;
import org.springframework.transaction.annotation.*;
import java.time.Instant;
@Service @RequiredArgsConstructor
public class TaReadService {
    private final TaMapper mapper;
    private final TradeMapper trades;
    private final ITradeService cash;
    private final TradeOrderReader reader;
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public TaSummary summary(long userId){
        var account=cash.cash(userId);
        return new TaSummary(mapper.pending(userId),account.cashBalance(),account.frozenAmount(),account.availableCash(),1,Instant.now());
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public PageResponse<TaOrderSummary> orders(long userId,TaQuery query){
        String name=mapper.customerName(userId);
        var rows=mapper.orders(userId,query);
        var content=reader.summaries(rows).stream().map(o->{var v=new TaOrderSummary();BeanUtils.copyProperties(o,v);v.setCustomerUserId(userId);v.setCustomerName(name);return v;}).toList();
        return new PageResponse<>(content,trades.count(userId,query.trades()),query.pageNumber(),query.pageSize());
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public PageResponse<ReceiptView> receipts(long userId,TaQuery query){
        var orders=reader.summaries(mapper.receiptedOrders(userId,query));
        var content=orders.stream().map(o->{var r=o.getTaReceipt();return new ReceiptView(r.id(),r.receiptNo(),r.result(),r.confirmDate(),r.navDate(),r.unitNav(),r.totalConfirmedAmount(),r.totalFee(),r.failReason(),r.failReasonLabel(),r.receivedAt(),o.getOrderCode(),o.getTradeType(),o.getTargetLabel());}).toList();
        return new PageResponse<>(content,mapper.receiptCount(userId),query.pageNumber(),query.pageSize());
    }
}
