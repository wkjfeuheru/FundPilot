package com.jason.trade.dto;
import java.time.Instant;
import java.util.List;
public record AutoInvestPlan(long id,long userId,String monthlyAmount,int executeDay,String status,List<Fund> funds,Instant createdAt,Instant updatedAt) {
    public record Fund(long fundId,String fundCode,String fundName,String monthlyAmount) {}
}
