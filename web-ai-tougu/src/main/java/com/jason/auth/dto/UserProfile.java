package com.jason.auth.dto;
import java.time.Instant;
public record UserProfile(long id, String username, String displayName, Role role, String status,
    boolean isSecurityVerified, String riskLevel, String riskLevelLabel, String riskProfileType,
    String accountType, Instant createdAt) { }
