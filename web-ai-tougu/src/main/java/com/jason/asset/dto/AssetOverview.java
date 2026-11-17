package com.jason.asset.dto;
import java.time.*;
import java.util.List;
public record AssetOverview(String totalAsset,String holdingMarketValue,String cashBalance,String availableCash,
    String cumulativePnl,String cumulativePnlRate,String last30dPnl,String portfolioRiskLevel,String portfolioRiskLevelLabel,
    boolean matchesProfile,List<Allocation> allocation,List<Holding> topHoldings,List<Insight> insights,LocalDate asOfDate,Instant updatedAt) {
    public record Allocation(String assetClass,String assetClassLabel,String weight,String marketValue) {}
    public record Holding(long id,long fundId,String fundCode,String fundName,String fundType,String riskLevel,
        String shares,String costAmount,String latestNav,LocalDate navDate,String marketValue,String pnl,String pnlRate,
        String shareRatio,LocalDate asOfDate,String purchaseStatus,String redeemStatus) {}
    public record Insight(String type,String title,String description,String tag,String tagLevel,String sourceRuleCode) {}
}
