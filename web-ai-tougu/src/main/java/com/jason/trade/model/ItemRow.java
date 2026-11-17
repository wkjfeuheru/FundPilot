package com.jason.trade.model;
import lombok.Data;
import java.math.BigDecimal;
@Data public class ItemRow {
    private long id,orderId,fundId;
    private String fundCode,fundName;
    private int direction;
    private BigDecimal amount,shares,fee,confirmedAmount,confirmedShares;
}
