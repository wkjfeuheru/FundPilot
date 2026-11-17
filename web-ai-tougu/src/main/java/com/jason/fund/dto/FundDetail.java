package com.jason.fund.dto;
import lombok.Getter;
import lombok.Setter;
import java.time.*;
@Getter @Setter
public class FundDetail extends FundView {
    private String benchmark,dataSource;
    private LocalDate inceptionDate;
    private Instant dataSyncedAt;
    private Fees fees;
    private RiskMetrics riskMetrics;
    public record Fees(String purchase,String redeem,String manage,String custodian,String salesService) {}
    public record RiskMetrics(String annualizedVolatility,String maxDrawdown,String window,LocalDate asOfDate) {}
}
