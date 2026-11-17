package com.jason.trade.dto;
import jakarta.validation.constraints.*;
public record PurchaseRequest(@NotNull @Positive Long fundId,
    @tools.jackson.databind.annotation.JsonDeserialize(using=AmountStringDeserializer.class)
    @NotBlank @Pattern(regexp="(?:0|[1-9][0-9]{0,15})\\.[0-9]{2}",message="金额须为最多16位整数、两位小数的字符串") String amount,
    Boolean riskAcknowledged) {
    public PurchaseRequest { riskAcknowledged=Boolean.TRUE.equals(riskAcknowledged); }
}
