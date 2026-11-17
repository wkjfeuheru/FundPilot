package com.jason.user.model;
import lombok.Data;
import java.time.*;
@Data public class AssessmentRow {
    private long id; private long userId; private long questionnaireId; private String answers;
    private int totalScore; private int riskLevel; private Instant evaluatedAt; private LocalDate validUntil;
}
