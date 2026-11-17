package com.jason.trade.dto;
import java.time.*;
public record TaReceipt(long id,String receiptNo,String result,LocalDate confirmDate,LocalDate navDate,String unitNav,
    String totalConfirmedAmount,String totalFee,String failReason,String failReasonLabel,Instant receivedAt) {}
