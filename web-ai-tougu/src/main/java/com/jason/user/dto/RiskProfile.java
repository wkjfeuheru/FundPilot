package com.jason.user.dto;
import java.time.*;
public record RiskProfile(long userId,String riskLevel,String riskLevelLabel,String investmentGoal,
    String goalCategory,String goalCategoryLabel,int horizonYears,String liquidityNeed,String liquidityNeedLabel,
    int experienceYears,String accountType,Instant evaluatedAt,LocalDate validUntil,boolean isEffective,Long latestAssessmentId) {}
