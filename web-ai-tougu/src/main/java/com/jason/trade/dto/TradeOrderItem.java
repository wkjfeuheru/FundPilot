package com.jason.trade.dto;
public record TradeOrderItem(long id,long fundId,String fundCode,String fundName,String direction,
    String amount,String shares,String fee,String confirmedAmount,String confirmedShares) {}
