package com.jason.fund.model;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
@Data
public class NavRow {
    private LocalDate navDate;
    private BigDecimal unitNav,accumNav,per10kIncome,annualized7d;
}
