package com.jason.user.model;
import lombok.Data;
import java.time.*;
@Data
public class RiskProfileRow {
    private long userId;
    private int riskLevel,goalCategory,horizonYears,liquidityNeed,experienceYears;
    private String investmentGoal,accountType;
    private Instant evaluatedAt;
    private LocalDate validUntil;
    private Long latestAssessmentId;
}
