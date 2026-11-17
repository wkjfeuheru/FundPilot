package com.jason.trade.model;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;
@Data public class AutoInvestRow { private long id,userId;private BigDecimal monthlyAmount;private int executeDay,status;private Instant createdAt,updatedAt; }
