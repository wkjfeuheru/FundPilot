package com.jason.trade.service;
import com.jason.trade.model.*;
import com.jason.exception.*;
import org.springframework.stereotype.Component;
import java.math.*;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
/** Pure accounting plan, applied atomically only after every leg has been validated. */
@Component public class SettlementCalculator {
    public record Plan(BigDecimal cashDelta,BigDecimal amount,BigDecimal fee,List<ItemRow> items,List<HoldingRow> holdings){}
    public Plan calculate(OrderRow order,List<ItemRow> items,List<SettlementFund> funds,List<HoldingRow> holdings){
        if(items.isEmpty() || order.getTradeType()<1 || order.getTradeType()>4)throw invalid("交易类型或明细不支持登记");
        var navs=funds.stream().collect(Collectors.toMap(SettlementFund::getId,Function.identity()));
        var balances=holdings.stream().collect(Collectors.toMap(HoldingRow::getFundId,Function.identity()));
        List<HoldingRow> changed=new ArrayList<>();
        BigDecimal buy=BigDecimal.ZERO,sell=BigDecimal.ZERO,fees=BigDecimal.ZERO;
        for(var item:items){
            var fund=navs.get(item.getFundId());
            if(fund==null || fund.getUnitNav()==null || fund.getUnitNav().signum()<=0)throw new BusinessException(ErrorCode.TA_NAV_NOT_AVAILABLE);
            BigDecimal amount,shares,fee=item.getFee();
            HoldingRow holding=balances.get(item.getFundId());
            if(holding==null){holding=new HoldingRow();holding.setUserId(order.getUserId());holding.setFundId(item.getFundId());holding.setShares(BigDecimal.ZERO);holding.setCostAmount(BigDecimal.ZERO);}
            if(item.getDirection()==1){
                amount=item.getAmount();
                if(amount.signum()<=0 || fee.signum()<0 || fee.compareTo(amount)>=0)throw invalid("买入金额或费用异常");
                shares=amount.subtract(fee).divide(fund.getUnitNav(),4,RoundingMode.HALF_UP);
                if(shares.signum()<=0)throw invalid("确认份额不足最小精度");
                holding.setShares(holding.getShares().add(shares));
                holding.setCostAmount(holding.getCostAmount().add(amount.subtract(fee)));
                buy=buy.add(amount);
            }else if(item.getDirection()==2){
                shares=item.getShares();
                if(shares.signum()<=0 || shares.compareTo(holding.getShares())>0)throw invalid("可用持仓份额不足，无法确认");
                amount=money(shares.multiply(fund.getUnitNav()));
                if(order.getTradeType()==2)fee=money(amount.multiply(fund.getFeeRedeem()).movePointLeft(2));
                if(fee.signum()<0 || fee.compareTo(amount)>0)throw invalid("卖出费用异常");
                BigDecimal remaining=holding.getShares().subtract(shares);
                BigDecimal removed=remaining.signum()==0?holding.getCostAmount():holding.getCostAmount().multiply(shares).divide(holding.getShares(),2,RoundingMode.HALF_UP);
                holding.setShares(remaining);holding.setCostAmount(holding.getCostAmount().subtract(removed));
                sell=sell.add(amount);
            }else throw invalid("交易方向异常");
            fees=fees.add(fee);
            item.setConfirmedAmount(amount);item.setConfirmedShares(shares);item.setFee(fee);
            changed.add(holding);
        }
        if((order.getTradeType()==1 || order.getTradeType()==4) && sell.signum()!=0 || order.getTradeType()==2 && buy.signum()!=0)throw invalid("交易方向与类型不一致");
        BigDecimal delta=switch(order.getTradeType()){case 1,4->buy.negate();case 2->sell.subtract(fees);default->sell.subtract(buy).subtract(fees);};
        return new Plan(money(delta),money(buy.add(sell)),money(fees),items,changed);
    }
    public static BigDecimal money(BigDecimal value){return value.setScale(2,RoundingMode.HALF_UP);}
    private BusinessException invalid(String message){return new BusinessException(ErrorCode.CONFLICT,message);}
}
