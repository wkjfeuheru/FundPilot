package com.jason.asset.dto;
import java.time.LocalDate;
import java.util.List;
public record AssetTrend(String range,List<Point> points,Summary summary) {
    public record Point(LocalDate date,String totalAsset,String portfolioReturnRate,String benchmarkReturnRate) {}
    public record Summary(String portfolioReturnRate,String benchmarkReturnRate,String excessReturnRate) {}
}
