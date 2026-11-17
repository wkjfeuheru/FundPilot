package com.jason.user.service;
import com.jason.user.dto.RiskProfile;
import com.jason.user.mapper.RiskProfileMapper;
import com.jason.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.*;
import java.util.List;
@Service @RequiredArgsConstructor
public class RiskProfileServiceImpl implements IRiskProfileService {
    private final RiskProfileMapper mapper;
    private final Clock clock;
    @Override public RiskProfile current(long id) {
        var r=mapper.find(id);
        if(r==null) throw new BusinessException(ErrorCode.NOT_FOUND,"尚未完成风险测评");
        boolean effective=!r.getValidUntil().isBefore(LocalDate.now(clock.withZone(ZoneId.of("Asia/Shanghai"))));
        return new RiskProfile(id,"R"+r.getRiskLevel(),"R"+r.getRiskLevel()+" "+List.of("保守型","稳健型","平衡型","成长型","进取型").get(r.getRiskLevel()-1),
            r.getInvestmentGoal(),List.of("NOT_SET","STABLE_GROWTH","BALANCED_GROWTH","AGGRESSIVE_GROWTH","FIXED_INCOME_PLUS","MULTI_ASSET").get(r.getGoalCategory()),
            List.of("未设置","稳健增值","均衡增长","积极成长","固收+","多资产").get(r.getGoalCategory()),r.getHorizonYears(),
            List.of("NOT_SET","LOW","MEDIUM","HIGH").get(r.getLiquidityNeed()),List.of("未设置","低","中","高").get(r.getLiquidityNeed()),
            r.getExperienceYears(),r.getAccountType(),Instant.EPOCH.equals(r.getEvaluatedAt())?null:r.getEvaluatedAt(),
            LocalDate.of(1970,1,1).equals(r.getValidUntil())?null:r.getValidUntil(),effective,r.getLatestAssessmentId());
    }
}
