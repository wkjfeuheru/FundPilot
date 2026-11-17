package com.jason.asset.dto;
import java.time.LocalDate;
import java.util.List;
public record Holdings(List<AssetOverview.Holding> items,Summary summary,LocalDate asOfDate) {
    public record Summary(String marketValue,String costAmount,String pnl,String pnlRate,int holdingCount) {}
}
