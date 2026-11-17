package com.jason.auth.config;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;
import java.math.BigDecimal;
@Getter @Setter @Validated
@ConfigurationProperties(prefix="app.registration")
public class AuthProperties {
    private boolean enabled = true;
    @NotNull @DecimalMin("0.00") @Digits(integer=16,fraction=2)
    private BigDecimal investorDemoCash = new BigDecimal("50000.00");
}
