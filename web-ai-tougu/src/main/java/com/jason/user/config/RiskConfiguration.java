package com.jason.user.config;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;
import java.time.Clock;
@Configuration @org.springframework.scheduling.annotation.EnableScheduling @EnableConfigurationProperties(RiskAssessmentProperties.class)
public class RiskConfiguration { @Bean public Clock riskClock() { return Clock.systemUTC(); } }
