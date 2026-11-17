package com.jason.fund.dto;
import lombok.Data;
import java.time.*;
import java.util.List;
@Data
public class FundView {
    private long id;
    private String fundCode,name,fundType,fundTypeLabel,riskLevel,riskLevelLabel,categoryLabel,company,manager;
    private List<String> styleTags;
    private String fundSize,latestNav,return1y,per10kIncome,annualized7d,purchaseStatus,purchaseStatusLabel,redeemStatus,redeemStatusLabel,poolRating,poolRatingLabel;
    private LocalDate fundSizeAsOfDate,latestNavDate;
    private boolean isFavorite,isPoolEligible;
    // Explicit getters keep JSON's contract names instead of JavaBean boolean prefix stripping.
    @com.fasterxml.jackson.annotation.JsonProperty("isFavorite") public boolean isFavorite() { return isFavorite; }
    @com.fasterxml.jackson.annotation.JsonProperty("isPoolEligible") public boolean isPoolEligible() { return isPoolEligible; }
}
