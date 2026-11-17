package com.jason.user.service;
import com.jason.user.config.RiskAssessmentProperties;
import com.jason.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.util.List;
@Component @RequiredArgsConstructor
public class RiskScoring {
    private final RiskAssessmentProperties properties;
    public int level(int score,int maximum) {
        if(maximum<=0 || maximum>32767 || score<0 || score>maximum) throw new BusinessException(ErrorCode.INTERNAL_ERROR,"问卷分值配置异常");
        if(!properties.getLevels().isEmpty()) {
            if(properties.getLevels().get(4)<maximum) throw new BusinessException(ErrorCode.INTERNAL_ERROR,"等级配置未覆盖问卷最高分");
            for(int i=0;i<5;i++) if(score<=properties.getLevels().get(i)) return i+1;
        }
        for(int level=1;level<=5;level++) if((long)score*5<=(long)maximum*level) return level;
        return 5;
    }
    public static String label(int level) { return "R"+level+" "+List.of("保守型","稳健型","平衡型","成长型","进取型").get(level-1); }
}
