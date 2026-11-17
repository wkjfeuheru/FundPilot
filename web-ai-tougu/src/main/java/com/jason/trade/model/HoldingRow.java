package com.jason.trade.model;
import lombok.Data;
import java.math.BigDecimal;
@Data public class HoldingRow {
    private long id,userId,fundId;
    private BigDecimal shares,costAmount;
}
