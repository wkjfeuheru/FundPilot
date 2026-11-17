package com.jason.fund.dto;
import java.util.List;
public record FundList(List<FundView> items,int total) {}
