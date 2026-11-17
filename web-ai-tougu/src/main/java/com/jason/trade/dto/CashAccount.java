package com.jason.trade.dto;
import java.time.Instant;
public record CashAccount(long userId,String cashBalance,String frozenAmount,String availableCash,Instant updatedAt) {}
