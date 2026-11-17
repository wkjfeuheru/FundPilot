package com.jason.fund.service;
import com.jason.fund.dto.*;
import com.jason.fund.mapper.FundMapper;
import com.jason.fund.model.*;
import com.jason.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import java.math.*;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class FundServiceImpl implements IFundService {
    private final FundMapper mapper;
    private final ObjectMapper json;
    private static final List<String> TYPES=List.of("EQUITY","BOND","MONEY","GOLD");
    private static final List<String> TYPE_LABELS=List.of("权益","债券","货币","黄金");
    private static final List<String> RISKS=List.of("低风险","中低风险","中风险","中高风险","高风险");
    @Override public FundList list(long userId,FundQuery q,boolean favoritesOnly) {
        var items=mapper.list(userId,q.typeCode(),q.riskCode(),q.keyword()==null?null:q.keyword().strip(),Boolean.TRUE.equals(q.onlyPoolEligible()),favoritesOnly)
            .stream().map(row -> populate(row,new FundView())).toList();
        return new FundList(items,items.size());
    }
    @Override public FundDetail detail(long userId,long id) {
        FundRow row=required(id,userId);
        FundDetail detail=populate(row,new FundDetail());
        detail.setBenchmark(row.getBenchmark()); detail.setInceptionDate(date(row.getInceptionDate()));
        detail.setDataSource(row.getDataSource()); detail.setDataSyncedAt(Instant.EPOCH.equals(row.getDataSyncedAt())?null:row.getDataSyncedAt());
        detail.setFees(new FundDetail.Fees(number(row.getFeePurchase()),number(row.getFeeRedeem()),number(row.getFeeManage()),number(row.getFeeCustodian()),number(row.getFeeSalesService())));
        detail.setRiskMetrics(metrics(row,mapper.navs(id,row.getLatestNavDate().minusYears(1),row.getLatestNavDate())));
        return detail;
    }
    @Override public NavSeries navs(long userId,long id,NavQuery q) {
        FundRow fund=required(id,userId);
        boolean custom=q.from()!=null || q.to()!=null;
        String range=q.range()==null?"1Y":q.range();
        LocalDate end=custom?q.to():fund.getLatestNavDate();
        LocalDate start=custom?q.from():end.minusMonths(switch(range){case "1M"->1;case "3M"->3;case "6M"->6;default->12;});
        if(start==null || end==null || start.isAfter(end)) throw new BusinessException(ErrorCode.INVALID_REQUEST,"请提供有效的起止日期，且开始日期不得晚于结束日期");
        var all=mapper.navs(id,start,end);
        List<NavSeries.Point> points=new ArrayList<>();
        int count=Math.min(250,all.size());
        for(int i=0;i<count;i++) {
            int index=count==1?0:(int)((long)i*(all.size()-1)/(count-1));
            var n=all.get(index);
            points.add(new NavSeries.Point(n.getNavDate(),number(n.getUnitNav()),number(n.getAccumNav()),number(n.getPer10kIncome()),number(n.getAnnualized7d())));
        }
        return new NavSeries(id,fund.getFundCode(),custom?"CUSTOM":range,points);
    }
    @Override @Transactional public void setFavorite(long userId,long id,boolean favorite) {
        required(id,userId);
        if(favorite) mapper.addFavorite(userId,id); else mapper.removeFavorite(userId,id);
    }
    private FundRow required(long id,long userId) {
        FundRow row=mapper.find(id,userId);
        if(row==null) throw new BusinessException(ErrorCode.FUND_NOT_FOUND);
        return row;
    }
    private <T extends FundView> T populate(FundRow r,T v) {
        v.setId(r.getId());v.setFundCode(r.getFundCode());v.setName(r.getName());
        v.setFundType(TYPES.get(r.getFundType()-1));v.setFundTypeLabel(TYPE_LABELS.get(r.getFundType()-1));
        v.setRiskLevel("R"+r.getRiskLevel());v.setRiskLevelLabel("R"+r.getRiskLevel()+" "+RISKS.get(r.getRiskLevel()-1));
        v.setCategoryLabel(r.getCategoryLabel());v.setCompany(r.getCompany());v.setManager(r.getManager());
        v.setStyleTags(r.getStyleTags()==null?List.of():json.readValue(r.getStyleTags(),json.getTypeFactory().constructCollectionType(List.class,String.class)));
        v.setFundSize(r.getFundSize().setScale(2).toPlainString());v.setFundSizeAsOfDate(date(r.getFundSizeAsOfDate()));
        v.setLatestNav(number(r.getLatestNav()));v.setLatestNavDate(r.getLatestNavDate());
        v.setReturn1y(r.getFundType()==3?"0.0000":number(r.getReturn1y()));
        v.setPer10kIncome(number(r.getPer10kIncome()));v.setAnnualized7d(number(r.getAnnualized7d()));
        v.setPurchaseStatus(List.of("OPEN","LIMITED","SUSPENDED").get(r.getPurchaseStatus()-1));
        v.setPurchaseStatusLabel(List.of("开放申购","限购","暂停申购").get(r.getPurchaseStatus()-1));
        v.setRedeemStatus(r.getRedeemStatus()==1?"OPEN":"SUSPENDED");v.setRedeemStatusLabel(r.getRedeemStatus()==1?"开放赎回":"暂停赎回");
        v.setPoolRating(List.of("UNRATED","A_PLUS","A","B_PLUS").get(r.getPoolRating()));v.setPoolRatingLabel(List.of("未评级","A+","A","B+").get(r.getPoolRating()));
        v.setFavorite(r.isFavorite());v.setPoolEligible(r.isPoolEligible());return v;
    }
    private FundDetail.RiskMetrics metrics(FundRow f,List<NavRow> navs) {
        if(f.getFundType()==3) return new FundDetail.RiskMetrics("0.0000","0.0000","1Y",f.getLatestNavDate());
        if(navs.size()<3 || navs.stream().anyMatch(n -> n.getUnitNav().signum()<=0)) return new FundDetail.RiskMetrics(null,null,"1Y",f.getLatestNavDate());
        double peak=navs.getFirst().getUnitNav().doubleValue(),drawdown=0,mean=0,m2=0;int count=0;
        for(int i=1;i<navs.size();i++) {
            double value=navs.get(i).getUnitNav().doubleValue();
            double change=value/navs.get(i-1).getUnitNav().doubleValue()-1;
            count++;double delta=change-mean;mean+=delta/count;m2+=delta*(change-mean);
            peak=Math.max(peak,value);drawdown=Math.max(drawdown,1-value/peak);
        }
        return new FundDetail.RiskMetrics(number(BigDecimal.valueOf(Math.sqrt(m2/(count-1))*Math.sqrt(252)*100)),number(BigDecimal.valueOf(-drawdown*100)),"1Y",f.getLatestNavDate());
    }
    private static String number(BigDecimal n) {return n==null?null:n.setScale(4,RoundingMode.HALF_UP).toPlainString();}
    private static LocalDate date(LocalDate d) {return LocalDate.of(1970,1,1).equals(d)?null:d;}
}
