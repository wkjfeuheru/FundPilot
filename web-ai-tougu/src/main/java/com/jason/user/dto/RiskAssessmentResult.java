package com.jason.user.dto;
import java.time.*;
public record RiskAssessmentResult(long id, long userId, long questionnaireId, int totalScore,
    String riskLevel, String riskLevelLabel, Long evaluatedByUserId, Instant evaluatedAt, LocalDate validUntil) {}
