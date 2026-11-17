package com.jason.fund.model;
import lombok.Data;
import java.math.BigDecimal;
import java.time.*;
@Data
public class FundRow {
    private long id;
    private String fundCode,name,categoryLabel,styleTags,company,manager,benchmark,dataSource;
    private int fundType,riskLevel,purchaseStatus,redeemStatus,poolRating;
    private boolean favorite,poolEligible;
    private BigDecimal fundSize,latestNav,return1y,per10kIncome,annualized7d,feePurchase,feeRedeem,feeManage,feeCustodian,feeSalesService;
    private LocalDate fundSizeAsOfDate,inceptionDate,latestNavDate;
    private Instant dataSyncedAt;
}
