package com.jason.trade.dto;
import lombok.*;
import java.time.Instant;
import java.util.List;
@Data @EqualsAndHashCode(callSuper=true)
public class TradeOrderDetail extends TradeOrderSummary {
    private List<TradeOrderItem> items;
    private Instant updatedAt;
}
