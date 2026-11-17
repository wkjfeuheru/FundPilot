package com.jason.asset.model;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
@Data public class HoldingRow {
    private long id,fundId;
    private String fundCode,fundName,company;
    private int fundType,riskLevel,purchaseStatus,redeemStatus;
    private BigDecimal shares,costAmount,latestNav;
    private LocalDate navDate;
}
