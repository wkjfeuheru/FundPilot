package com.jason.ta.dto;
import com.jason.trade.dto.TradeOrderSummary;
import lombok.*;
@Data @EqualsAndHashCode(callSuper=true)
public class TaOrderSummary extends TradeOrderSummary {private long customerUserId;private String customerName;}
