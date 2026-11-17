package com.jason.platform.dto;
import java.time.*;
public record BusinessDay(LocalDate businessDate,boolean isTradingDay,LocalDate previousTradingDay,
                          LocalDate nextTradingDay,String timezone,Instant serverTime) {}
