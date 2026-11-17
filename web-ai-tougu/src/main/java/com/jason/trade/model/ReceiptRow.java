package com.jason.trade.model;
import lombok.Data;
import java.math.BigDecimal;
import java.time.*;
@Data public class ReceiptRow {
    private long id,orderId;
    private String receiptNo;
    private int result,failReason;
    private LocalDate confirmDate,navDate;
    private BigDecimal unitNav,totalConfirmedAmount,totalFee;
    private Instant receivedAt;
}
