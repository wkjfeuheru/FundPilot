package com.jason.trade.dto;
import java.time.LocalDate;
import java.util.List;
public record PurchaseQuote(long fundId,String fundCode,String fundName,String riskLevel,String purchaseStatus,String redeemStatus,
    LocalDate navDate,String unitNav,String amount,String feeRate,String feeAmount,String estimatedShares,String availableCash,
    boolean riskAcknowledgmentRequired,List<String> warnings) {}
