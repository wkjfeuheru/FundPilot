package com.jason.fund.dto;
import jakarta.validation.constraints.*;
public record FundQuery(@Pattern(regexp="EQUITY|BOND|MONEY|GOLD") String fundType,
    @Pattern(regexp="R[1-5]") String riskLevel, @Size(max=128) String keyword, Boolean onlyPoolEligible) {
    public Integer typeCode() { return fundType==null?null:java.util.List.of("EQUITY","BOND","MONEY","GOLD").indexOf(fundType)+1; }
    public Integer riskCode() { return riskLevel==null?null:Integer.valueOf(riskLevel.substring(1)); }
}
