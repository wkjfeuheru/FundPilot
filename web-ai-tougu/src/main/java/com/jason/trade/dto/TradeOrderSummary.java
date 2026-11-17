package com.jason.trade.dto;
import lombok.Data;
import java.time.*;
@Data
public class TradeOrderSummary {
    private long id;
    private String orderCode,tradeType,tradeTypeLabel,status,statusLabel;
    private LocalDate tradeDate;
    private Long adviceId,planId;
    private String totalAmountIn,totalAmountOut,totalFee,freezeAmount,targetLabel,remark;
    private TaReceipt taReceipt;
    private Instant createdAt;
}
