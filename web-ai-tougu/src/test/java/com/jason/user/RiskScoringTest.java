package com.jason.user;
import com.jason.user.config.RiskAssessmentProperties;
import com.jason.user.service.RiskScoring;
import com.jason.exception.BusinessException;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
class RiskScoringTest {
    @Test void assignsExactBoundariesToLowerLevelAndSupportsAllFiveLevels() {
        var scoring=new RiskScoring(new RiskAssessmentProperties());
        int[] scores={0,32,33,64,65,96,97,128,129,160};
        int[] expected={1,1,2,2,3,3,4,4,5,5};
        for(int i=0;i<scores.length;i++) assertThat(scoring.level(scores[i],160)).isEqualTo(expected[i]);
    }
    @Test void configuredUpperBoundsAreInclusiveAndMustCoverQuestionnaire() {
        var config=new RiskAssessmentProperties(); config.setLevels(List.of(10,20,30,40,100));
        var scoring=new RiskScoring(config);
        assertThat(scoring.level(20,100)).isEqualTo(2);
        assertThat(scoring.level(21,100)).isEqualTo(3);
        assertThatThrownBy(() -> scoring.level(100,160)).isInstanceOf(BusinessException.class);
        config.setLevels(List.of(10,20,20,40,100)); assertThat(config.isLevelsValid()).isFalse();
    }
}
