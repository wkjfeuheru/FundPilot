package com.jason.trade.service;
import com.jason.trade.dto.*;
import com.jason.trade.model.*;
import com.jason.trade.mapper.*;
import com.jason.platform.service.*;
import com.jason.platform.service.WriteReplay.Reply;
import com.jason.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import tools.jackson.databind.ObjectMapper;
import java.math.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service @RequiredArgsConstructor
public class ReceiptServiceImpl implements IReceiptService {
    private final TradeMapper trades;
    private final SettlementMapper mapper;
    private final SettlementCalculator calculator;
    private final TradeOrderReader views;
    private final TradingCalendar calendar;
    private final WriteReplay replay;
    private final ObjectMapper json;
    private static final List<String> REASONS=List.of("NONE","PURCHASE_SUSPENDED","PURCHASE_LIMITED","REDEMPTION_SUSPENDED","REDEMPTION_RESTRICTED","TRADING_STATUS_ABNORMAL");
    @Override @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public ReceiptPreview preview(long userId,long orderId){
        var order=required(userId,orderId);pending(order);
        var items=trades.items(List.of(orderId));var ids=items.stream().map(ItemRow::getFundId).toList();
        var funds=navs(ids,order.getTradeDate());
        var plan=calculator.calculate(order,items,funds,mapper.holdings(userId,ids));
        var names=new HashMap<Long,String>();funds.forEach(f->names.put(f.getId(),f.getName()));
        var confirmDate=calendar.nextOrSame(order.getTradeDate().plusDays(1));
        return new ReceiptPreview(views.detail(userId,orderId),receiptNo(orderId,confirmDate),confirmDate,order.getTradeDate(),
            unit(order,funds).toPlainString(),plan.amount().toPlainString(),plan.fee().toPlainString(),
            plan.items().stream().map(i->new ReceiptPreview.Item(i.getFundId(),names.get(i.getFundId()),money(i.getConfirmedAmount()),shares(i.getConfirmedShares()),money(i.getFee()))).toList());
    }
    @Override @Transactional(isolation=Isolation.READ_COMMITTED)
    public Reply<TradeOrderDetail> confirm(long userId,long orderId,String key,ReceiptCommand command,String traceId){
        required(userId,orderId); // Scope before replay: a changed configured demo account must not expose an old result.
        int reason=reason(command);
        var claim=replay.claim(key,0,"POST /api/v1/ta/trade-orders/"+orderId+"/ta-receipts",Map.of("userId",userId,"result",command.result(),"failReason",REASONS.get(reason)));
        if(claim.replayed())return replay.read(claim,TradeOrderDetail.class);
        if(trades.lockCash(userId)==null)throw new BusinessException(ErrorCode.NOT_FOUND,"资金账户未初始化");
        var order=mapper.lockOrder(userId,orderId);pending(order);
        var items=trades.items(List.of(orderId));var ids=items.stream().map(ItemRow::getFundId).toList();
        var funds=navs(ids,order.getTradeDate());
        boolean success="SUCCESS".equals(command.result());
        BigDecimal confirmed=BigDecimal.ZERO,fee=BigDecimal.ZERO;
        if(success){
            var plan=calculator.calculate(order,items,funds,mapper.holdings(userId,ids));
            var cash=trades.cash(userId);
            // Other pending orders retain their reservations after this order settles.
            if(cash.getCashBalance().add(plan.cashDelta()).compareTo(cash.getFrozenAmount().subtract(order.getFreezeAmount()))<0)
                throw new BusinessException(ErrorCode.CONFLICT,"结算资金不足，其他在途冻结资金不能被占用");
            if(mapper.cash(userId,plan.cashDelta())!=1)throw new BusinessException(ErrorCode.CONFLICT,"资金账户状态已变化");
            mapper.saveHoldings(plan.holdings());mapper.confirmItems(plan.items());
            confirmed=plan.amount();fee=plan.fee();
        }
        if(mapper.complete(orderId,success?2:3)!=1)throw new BusinessException(ErrorCode.TA_TRADE_ORDER_NOT_PENDING);
        ReceiptRow receipt=new ReceiptRow();receipt.setOrderId(orderId);receipt.setResult(success?1:2);
        receipt.setConfirmDate(calendar.nextOrSame(order.getTradeDate().plusDays(1)));receipt.setNavDate(order.getTradeDate());
        receipt.setReceiptNo(receiptNo(orderId,receipt.getConfirmDate()));
        receipt.setUnitNav(unit(order,funds));receipt.setTotalConfirmedAmount(confirmed);receipt.setTotalFee(fee);receipt.setFailReason(reason);
        mapper.receipt(receipt);
        String event=success?"trade.confirmed":"trade.failed";
        String payload=json.writeValueAsString(Map.of("orderId",orderId,"userId",userId,"adviceId",order.getAdviceId(),"status",success?"CONFIRMED":"FAILED","receiptId",receipt.getId()));
        mapper.audit(orderId,order.getOrderCode(),json.writeValueAsString(Map.of("receiptNo",receipt.getReceiptNo(),"result",command.result(),"failReason",REASONS.get(reason))),traceId);
        mapper.event(orderId,event,payload);
        return replay.complete(claim.id(),views.detail(userId,orderId),Duration.ofDays(7));
    }
    private OrderRow required(long userId,long id){var row=trades.order(userId,id);if(row==null)throw new BusinessException(ErrorCode.TRADE_ORDER_NOT_FOUND);return row;}
    private void pending(OrderRow row){if(row==null || row.getStatus()!=1)throw new BusinessException(ErrorCode.TA_TRADE_ORDER_NOT_PENDING);}
    private List<SettlementFund> navs(List<Long> ids,LocalDate date){
        if(ids.isEmpty())throw new BusinessException(ErrorCode.CONFLICT,"交易没有标的明细");
        var funds=mapper.funds(ids,date);
        if(funds.size()!=ids.size() || funds.stream().anyMatch(f->f.getUnitNav()==null || f.getUnitNav().signum()<=0))throw new BusinessException(ErrorCode.TA_NAV_NOT_AVAILABLE);
        return funds;
    }
    private BigDecimal unit(OrderRow order,List<SettlementFund> funds){return order.getTradeType()==3?BigDecimal.ZERO.setScale(4):funds.getFirst().getUnitNav().setScale(4);}
    private int reason(ReceiptCommand c){
        if(!List.of("SUCCESS","FAILED").contains(c.result()))throw new BusinessException(ErrorCode.INVALID_REQUEST);
        if("SUCCESS".equals(c.result())){
            if(c.failReason()!=null && !"NONE".equals(c.failReason()))throw new BusinessException(ErrorCode.TA_FAIL_REASON_INVALID);
            return 0;
        }
        if(c.failReason()==null || c.failReason().isBlank())throw new BusinessException(ErrorCode.TA_FAIL_REASON_REQUIRED);
        int reason=REASONS.indexOf(c.failReason());
        if(reason<=0)throw new BusinessException(ErrorCode.TA_FAIL_REASON_INVALID);
        return reason;
    }
    private static String money(BigDecimal n){return n.setScale(2,RoundingMode.HALF_UP).toPlainString();}
    private static String receiptNo(long orderId,LocalDate date){return "TA"+date.format(DateTimeFormatter.BASIC_ISO_DATE)+String.format(Locale.ROOT,"%03d",orderId);}
    private static String shares(BigDecimal n){return n.setScale(4,RoundingMode.HALF_UP).toPlainString();}
}
