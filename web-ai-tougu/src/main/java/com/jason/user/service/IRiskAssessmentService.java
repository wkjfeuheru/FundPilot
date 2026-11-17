package com.jason.user.service;
import com.jason.user.dto.*;
public interface IRiskAssessmentService {
    RiskQuestionnaire active();
    void removeExpiredKeys();
    RiskSubmission submit(long userId, String key, RiskAssessmentRequest request, String traceId);
}
