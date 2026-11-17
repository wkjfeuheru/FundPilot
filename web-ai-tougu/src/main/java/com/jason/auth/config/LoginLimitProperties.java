package com.jason.auth.config;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;
@Getter @Setter @Validated
@ConfigurationProperties(prefix="app.auth.login-limit")
public class LoginLimitProperties {
    @Min(1) private int maxFailures = 5;
    @Min(1) private long lockSeconds = 900;
}
