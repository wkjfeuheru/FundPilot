package com.jason.trade.model;
import lombok.Data;
import java.math.BigDecimal;
@Data public class AutoInvestFundRow {private long fundId;private String fundCode,fundName;private BigDecimal monthlyAmount;}
