package com.jason.user.dto;
import java.util.List;
public record RiskQuestionnaire(long id, String version, String title, int questionCount, List<Question> questions) {
    public record Question(long id, int sortNo, String title, List<Option> options) {}
    public record Option(int index, String text) {}
}
