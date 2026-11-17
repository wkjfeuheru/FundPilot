package com.jason.trade.dto;
import java.time.LocalDate;
import java.util.List;
public record ReceiptPreview(TradeOrderDetail order,LocalDate confirmDate,LocalDate navDate,String unitNav,
    String totalConfirmedAmount,String totalFee,List<Item> items){
    public record Item(long fundId,String fundName,String confirmedAmount,String confirmedShares,String fee){}
}
