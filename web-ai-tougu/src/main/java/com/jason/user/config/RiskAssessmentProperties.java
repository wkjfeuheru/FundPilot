package com.jason.user.config;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;
import jakarta.validation.constraints.*;
import java.util.List;
@Data @Validated @ConfigurationProperties("app.risk-assessment")
public class RiskAssessmentProperties {
    @Min(1) @Max(120) private int validityMonths=12;
    // Optional inclusive score upper bounds for R1..R5; empty means five equal ranges of the template maximum.
    private List<@PositiveOrZero Integer> levels=List.of();
    @AssertTrue(message="levels 必须为空或严格递增的五个分数上界")
    public boolean isLevelsValid() {
        if(levels.isEmpty()) return true;
        if(levels.size()!=5) return false;
        for(int i=1;i<levels.size();i++) if(levels.get(i)<=levels.get(i-1)) return false;
        return true;
    }
}
