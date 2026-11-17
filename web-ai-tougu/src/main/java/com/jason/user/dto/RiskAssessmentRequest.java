package com.jason.user.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
public record RiskAssessmentRequest(@NotNull @Positive Long questionnaireId,
    @NotNull @Size(max=100) List<@NotNull @Valid Answer> answers) {
    public record Answer(@NotNull @Positive Long questionId, @NotNull @Min(0) Integer optionIndex) {}
}
