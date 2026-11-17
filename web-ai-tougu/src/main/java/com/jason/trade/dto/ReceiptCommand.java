package com.jason.trade.dto;
import jakarta.validation.constraints.*;
public record ReceiptCommand(@NotBlank @Pattern(regexp="SUCCESS|FAILED") String result,String failReason) {}
