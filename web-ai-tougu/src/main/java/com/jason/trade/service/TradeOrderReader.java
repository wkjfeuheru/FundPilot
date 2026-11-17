package com.jason.trade.service;
import com.jason.trade.dto.*;
import com.jason.trade.model.*;
import com.jason.trade.mapper.TradeMapper;
import com.jason.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.math.*;
import java.util.*;
import java.util.stream.Collectors;
/** DTO projection only; the calling service owns the read/write transaction. */
@Component @RequiredArgsConstructor
public class TradeOrderReader {
    private final TradeMapper mapper;
    private static final List<String> TYPES=List.of("PURCHASE","REDEMPTION","REBALANCE","AUTO_INVEST","DIVIDEND");
    private static final List<String> TYPE_LABELS=List.of("基金申购","基金赎回","基金调仓","基金定投","基金分红");
    private static final List<String> STATES=List.of("PENDING_TA","CONFIRMED","FAILED");
    private static final List<String> STATE_LABELS=List.of("待登记确认","确认成功","确认失败");
    public TradeOrderDetail detail(long userId,long orderId){
        var row=mapper.order(userId,orderId);
        if(row==null)throw new BusinessException(ErrorCode.TRADE_ORDER_NOT_FOUND);
        var items=mapper.items(List.of(orderId));var receipts=mapper.receipts(List.of(orderId));
        var view=populate(row,items,receipts.isEmpty()?null:receipt(receipts.getFirst()),new TradeOrderDetail());
        view.setUpdatedAt(row.getUpdatedAt());
        view.setItems(items.stream().map(i->new TradeOrderItem(i.getId(),i.getFundId(),i.getFundCode(),i.getFundName(),i.getDirection()==1?"BUY":"SELL",
            decimal(i.getAmount(),2),decimal(i.getShares(),4),decimal(i.getFee(),2),decimal(i.getConfirmedAmount(),2),decimal(i.getConfirmedShares(),4))).toList());
        return view;
    }
    public List<TradeOrderSummary> summaries(List<OrderRow> rows){
        if(rows.isEmpty())return List.of();
        var ids=rows.stream().map(OrderRow::getId).toList();
        var items=mapper.items(ids).stream().collect(Collectors.groupingBy(ItemRow::getOrderId));
        var receipts=mapper.receipts(ids).stream().collect(Collectors.toMap(ReceiptRow::getOrderId,this::receipt));
        return rows.stream().map(row->populate(row,items.getOrDefault(row.getId(),List.of()),receipts.get(row.getId()),new TradeOrderSummary())).toList();
    }
    private <T extends TradeOrderSummary>T populate(OrderRow row,List<ItemRow> items,TaReceipt receipt,T view){
        view.setId(row.getId());view.setOrderCode(row.getOrderCode());view.setTradeType(TYPES.get(row.getTradeType()-1));view.setTradeTypeLabel(TYPE_LABELS.get(row.getTradeType()-1));
        view.setStatus(STATES.get(row.getStatus()-1));view.setStatusLabel(STATE_LABELS.get(row.getStatus()-1));view.setTradeDate(row.getTradeDate());
        view.setAdviceId(row.getAdviceId()==0?null:row.getAdviceId());view.setPlanId(row.getPlanId()==0?null:row.getPlanId());
        view.setTotalAmountIn(decimal(row.getTotalAmountIn(),2));view.setTotalAmountOut(decimal(row.getTotalAmountOut(),2));
        view.setTotalFee(decimal(row.getTotalFee(),2));view.setFreezeAmount(decimal(row.getFreezeAmount(),2));
        view.setTargetLabel(items.size()==1?items.getFirst().getFundName():items.isEmpty()?row.getRemark():"组合调仓 · "+items.size()+" 只基金");
        view.setRemark(row.getRemark());view.setTaReceipt(receipt);view.setCreatedAt(row.getCreatedAt());return view;
    }
    private TaReceipt receipt(ReceiptRow r){
        var reasons=List.of("NONE","PURCHASE_SUSPENDED","PURCHASE_LIMITED","REDEMPTION_SUSPENDED","REDEMPTION_RESTRICTED","TRADING_STATUS_ABNORMAL");
        var labels=List.of("无","基金暂停申购","限购","暂停赎回","赎回受限","交易状态异常");
        return new TaReceipt(r.getId(),r.getReceiptNo(),r.getResult()==1?"SUCCESS":"FAILED",r.getConfirmDate(),r.getNavDate(),decimal(r.getUnitNav(),4),
            decimal(r.getTotalConfirmedAmount(),2),decimal(r.getTotalFee(),2),reasons.get(r.getFailReason()),labels.get(r.getFailReason()),r.getReceivedAt());
    }
    private static String decimal(BigDecimal value,int scale){return value.setScale(scale,RoundingMode.HALF_UP).toPlainString();}
}
