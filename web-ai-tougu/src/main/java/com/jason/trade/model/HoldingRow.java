package com.jason.trade.model;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
@Data public class HoldingRow {
    private long id,userId,fundId;
    private int fundType,riskLevel,purchaseStatus,redeemStatus;
    private String fundCode,fundName;
    private BigDecimal shares,costAmount,latestNav;
    private LocalDate navDate;
}
