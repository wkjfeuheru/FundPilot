package com.jason.user.dto;
import com.jason.common.ResponseDTO;
public record RiskSubmission(ResponseDTO<RiskAssessmentResult> response, boolean replayed) {}
