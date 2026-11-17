package com.jason.trade.model;
import lombok.Data;
import java.time.*;
import java.math.BigDecimal;
@Data public class OrderRow {
    private long id,userId,adviceId,planId;
    private String orderCode,remark,targetLabel;
    private int tradeType,status;
    private LocalDate tradeDate;
    private BigDecimal totalAmountIn,totalAmountOut,totalFee,freezeAmount;
    private Instant createdAt,updatedAt;
}
