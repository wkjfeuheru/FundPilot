package com.jason.ta.dto;
import java.time.Instant;
public record TaSummary(long pendingCount,String cashBalance,String frozenAmount,String availableCash,int accountCount,Instant generatedAt){}
