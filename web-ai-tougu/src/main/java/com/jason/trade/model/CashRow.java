package com.jason.trade.model;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;
@Data public class CashRow {private long userId;private BigDecimal cashBalance,frozenAmount;private Instant updatedAt;}
