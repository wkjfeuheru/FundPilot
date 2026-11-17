package com.jason.fund.dto;
import jakarta.validation.constraints.Pattern;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
public record NavQuery(@Pattern(regexp="1M|3M|6M|1Y") String range,
    @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate from,
    @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate to) {}
