package com.jason.asset.service;
import com.jason.asset.dto.AssetOverview.*;
import com.jason.asset.model.*;
import com.jason.user.model.RiskProfileRow;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static com.jason.asset.service.AssetAmounts.*;

/** Deterministic descriptive rules. No LLM, implied approval or unavailable industry look-through. */
@Component public class AssetInsights {
    public List<Insight> evaluate(List<HoldingRow> rows,List<Allocation> allocation,List<TargetRow> targets,BigDecimal market,
        BigDecimal available,RiskProfileRow profile,LocalDate today) {
        Insight deviation=new Insight("ALLOCATION_DEVIATION","配置目标待完善","尚未关联完整的四类目标配置，暂无法评估配置偏离。","待完善","INFO",null);
        if(market.signum()==0) deviation=new Insight("ALLOCATION_DEVIATION","尚无基金持仓","当前资产为现金；完成交易登记后更新持仓配置。","现金账户","INFO",null);
        else if(targets.size()==4 && targets.stream().map(TargetRow::getTargetWeight).reduce(BigDecimal.ZERO,BigDecimal::add).compareTo(BigDecimal.valueOf(100))==0){
            BigDecimal max=BigDecimal.ZERO;String label="";
            for(var a:allocation){int code=List.of("EQUITY","BOND","MONEY","GOLD").indexOf(a.assetClass())+1;
                var target=targets.stream().filter(t->t.getAssetClass()==code).findFirst();
                if(target.isPresent()){var delta=new BigDecimal(a.weight()).subtract(target.get().getTargetWeight()).abs();if(delta.compareTo(max)>0){max=delta;label=a.assetClassLabel();}}}
            boolean high=max.compareTo(BigDecimal.valueOf(5))>0;
            deviation=new Insight("ALLOCATION_DEVIATION","配置偏离观察",max.signum()==0?"当前四类持仓权重与目标一致。":label+"与目标相差 "+money(max)+" 个百分点。",high?"偏离超5pp":"持续观察",high?"WARNING":"INFO",null);
        }
        BigDecimal largest=BigDecimal.ZERO;Map<String,BigDecimal> companies=new HashMap<>();boolean companyMissing=false;
        for(var row:rows){var value=row.getShares().multiply(row.getLatestNav()).setScale(2,java.math.RoundingMode.HALF_UP);largest=largest.max(value);
            if(row.getCompany()==null||row.getCompany().isBlank())companyMissing=true;else companies.merge(row.getCompany(),value,BigDecimal::add);}
        var single=percent(largest,market);var manager=percent(companies.values().stream().max(BigDecimal::compareTo).orElse(BigDecimal.ZERO),market);
        boolean concentrated=single.compareTo(BigDecimal.valueOf(25))>0||manager.compareTo(BigDecimal.valueOf(35))>0;
        var concentration=new Insight("CONCENTRATION","持仓集中度",market.signum()==0?"暂无持仓可评估。":"最大单基金占比 "+money(single)+"%；"+(companyMissing?"管理人信息不完整。":"最大管理人占比 "+money(manager)+"%。")+"观察阈值：单基金25%、管理人35%；行业穿透暂不可用。",concentrated?"关注集中度":"持续观察",concentrated?"WARNING":"INFO",null);
        boolean valid=profile!=null&&!profile.getValidUntil().isBefore(today);
        boolean above=valid&&rows.stream().anyMatch(r->r.getRiskLevel()>profile.getRiskLevel());
        var kyc=new Insight("KYC",valid?"画像与流动性提醒":"请完成有效风险测评",
            (valid?(above?"存在高于画像评级的基金，请核对风险承受能力。":"画像评级有效；仍需结合期限及流动性需求评估。"):(profile==null?"尚未完成风险测评。":"风险测评已过期。"))+"可用现金 "+money(available)+" 元；资金安排以实际需求为准。",
            !valid?"待测评":above?"风险提醒":"画像有效",!valid||above?"WARNING":"INFO",null);
        return List.of(deviation,concentration,kyc);
    }
}
