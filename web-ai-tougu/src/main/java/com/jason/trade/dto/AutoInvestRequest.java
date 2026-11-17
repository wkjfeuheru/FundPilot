package com.jason.trade.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import tools.jackson.databind.annotation.JsonDeserialize;
import java.util.List;
public record AutoInvestRequest(
    @JsonDeserialize(using=AmountStringDeserializer.class) @NotBlank @Pattern(regexp="(?:0|[1-9][0-9]{0,15})\\.[0-9]{2}") @DecimalMin("0.01") String monthlyAmount,
    @NotNull @Min(1) @Max(28) Integer executeDay,
    @NotNull @Size(min=1,max=10) List<@NotNull @Valid Fund> funds) {
    public record Fund(@NotNull @Positive Long fundId,
        @JsonDeserialize(using=AmountStringDeserializer.class) @NotBlank @Pattern(regexp="(?:0|[1-9][0-9]{0,15})\\.[0-9]{2}") @DecimalMin("0.01") String monthlyAmount) {}
}
