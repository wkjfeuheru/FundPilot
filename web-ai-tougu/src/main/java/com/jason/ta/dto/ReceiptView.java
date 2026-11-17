package com.jason.ta.dto;
import java.time.*;
public record ReceiptView(long id,String receiptNo,String result,LocalDate confirmDate,LocalDate navDate,String unitNav,
    String totalConfirmedAmount,String totalFee,String failReason,String failReasonLabel,Instant receivedAt,
    String orderCode,String tradeType,String targetLabel){}
