package com.jason.fund.dto;
import java.time.LocalDate;
import java.util.List;
public record NavSeries(long fundId,String fundCode,String range,List<Point> points) {
    public record Point(LocalDate navDate,String unitNav,String accumNav,String per10kIncome,String annualized7d) {}
}
