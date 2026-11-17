package com.jason.asset.service;
import com.jason.asset.dto.*;
import com.jason.asset.dto.AssetOverview.*;
import com.jason.asset.model.*;
import com.jason.asset.mapper.AssetMapper;
import com.jason.trade.mapper.TradeMapper;
import com.jason.user.mapper.RiskProfileMapper;
import com.jason.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.*;
import java.math.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import static com.jason.asset.service.AssetAmounts.*;

@Service @RequiredArgsConstructor
public class AssetServiceImpl implements IAssetService {
    private final AssetMapper mapper;
    private final TradeMapper trades;
    private final RiskProfileMapper profiles;
    private final AssetInsights rules;
    private final AssetPdfRenderer pdf;
    private final Clock clock;
    @Value("${app.asset.demo-benchmark-daily-percent:0.01}") private BigDecimal demoDailyPercent;
    private static final List<String> CLASSES=List.of("EQUITY","BOND","MONEY","GOLD"),LABELS=List.of("权益","债券","货币","黄金");
    private LocalDate today(){return LocalDate.now(clock.withZone(ZoneId.of("Asia/Shanghai")));}
    private BigDecimal value(HoldingRow h){
        if(h.getLatestNav()==null||h.getLatestNav().signum()<=0||h.getNavDate()==null||h.getNavDate().getYear()<2000)
            throw new BusinessException(ErrorCode.CONFLICT,"持仓基金缺少有效净值，暂无法计算资产，请稍后重试");
        return h.getShares().multiply(h.getLatestNav()).setScale(2,RoundingMode.HALF_UP);
    }
    @Override @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public AssetOverview overview(long userId){return snapshot(userId).overview();}
    @Override @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Holdings holdings(long userId){
        var snapshot=snapshot(userId);var overview=snapshot.overview();
        var cost=snapshot.holdings().stream().map(h->new BigDecimal(h.costAmount())).reduce(BigDecimal.ZERO,BigDecimal::add);
        return new Holdings(snapshot.holdings(),new Holdings.Summary(overview.holdingMarketValue(),money(cost),
            overview.cumulativePnl(),overview.cumulativePnlRate(),snapshot.holdings().size()),overview.asOfDate());
    }
    private record Snapshot(AssetOverview overview,List<Holding> holdings) {}
    private Snapshot snapshot(long userId){
        var cash=trades.cash(userId);if(cash==null)throw new BusinessException(ErrorCode.NOT_FOUND,"资金账户未初始化");
        var rows=mapper.holdings(userId);var market=rows.stream().map(this::value).reduce(BigDecimal.ZERO,BigDecimal::add);
        var cost=rows.stream().map(HoldingRow::getCostAmount).reduce(BigDecimal.ZERO,BigDecimal::add);
        var total=market.add(cash.getCashBalance());var available=cash.getCashBalance().subtract(cash.getFrozenAmount());
        var holdings=rows.stream().map(h->new Holding(h.getId(),h.getFundId(),h.getFundCode(),h.getFundName(),CLASSES.get(h.getFundType()-1),"R"+h.getRiskLevel(),
            h.getShares().setScale(4).toPlainString(),money(h.getCostAmount()),h.getLatestNav().setScale(4).toPlainString(),h.getNavDate(),money(value(h)),
            money(value(h).subtract(h.getCostAmount())),money(percent(value(h).subtract(h.getCostAmount()),h.getCostAmount())),money(percent(value(h),total)),h.getNavDate(),
            List.of("OPEN","LIMITED","SUSPENDED").get(h.getPurchaseStatus()-1),h.getRedeemStatus()==1?"OPEN":"SUSPENDED"))
            .sorted(Comparator.comparing((Holding h)->new BigDecimal(h.marketValue())).reversed().thenComparingLong(Holding::id)).toList();
        BigDecimal[] values={BigDecimal.ZERO,BigDecimal.ZERO,BigDecimal.ZERO,BigDecimal.ZERO};
        for(var h:rows)values[h.getFundType()-1]=values[h.getFundType()-1].add(value(h));
        BigDecimal[] weights=Arrays.stream(values).map(v->percent(v,market)).toArray(BigDecimal[]::new);
        if(market.signum()>0){int largest=0;for(int i=1;i<4;i++)if(values[i].compareTo(values[largest])>0)largest=i;
            weights[largest]=weights[largest].add(BigDecimal.valueOf(100).subtract(Arrays.stream(weights).reduce(BigDecimal.ZERO,BigDecimal::add)));}
        List<Allocation> allocation=new ArrayList<>();for(int i=0;i<4;i++)allocation.add(new Allocation(CLASSES.get(i),LABELS.get(i),money(weights[i]),money(values[i])));
        var profile=profiles.find(userId);String risk=profile==null?null:"R"+profile.getRiskLevel();
        var recent=mapper.snapshots(userId,today().minusDays(30),today());var last30=recent.size()<2?BigDecimal.ZERO:recent.getLast().getTotalAsset().subtract(recent.getFirst().getTotalAsset());
        var result=new AssetOverview(money(total),money(market),money(cash.getCashBalance()),money(available),money(market.subtract(cost)),money(percent(market.subtract(cost),cost)),money(last30),risk,
            risk==null?"未测评":risk+" "+List.of("保守型","稳健型","平衡型","成长型","进取型").get(profile.getRiskLevel()-1),profile!=null&&!profile.getValidUntil().isBefore(today()),
            List.copyOf(allocation),holdings.stream().limit(3).toList(),rules.evaluate(rows,allocation,mapper.targets(userId),market,available,profile,today()),
            rows.stream().map(HoldingRow::getNavDate).max(LocalDate::compareTo).orElse(null),clock.instant());
        return new Snapshot(result,holdings);
    }
    @Override @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public AssetTrend trend(long userId,String range){
        int months=switch(range){case "1M"->1;case "3M"->3;case "6M"->6;case "1Y"->12;default->throw new BusinessException(ErrorCode.INVALID_REQUEST,"区间仅支持1M/3M/6M/1Y");};
        var rows=mapper.snapshots(userId,today().minusMonths(months),today());List<AssetTrend.Point> points=new ArrayList<>();
        for(var row:rows){var base=rows.getFirst();BigDecimal benchmark=demoDailyPercent.multiply(BigDecimal.valueOf(ChronoUnit.DAYS.between(base.getSnapshotDate(),row.getSnapshotDate())));
            points.add(new AssetTrend.Point(row.getSnapshotDate(),money(row.getTotalAsset()),money(percent(row.getTotalAsset().subtract(base.getTotalAsset()),base.getTotalAsset())),money(benchmark)));}
        String portfolio=points.isEmpty()?"0.00":points.getLast().portfolioReturnRate(),benchmark=points.isEmpty()?"0.00":points.getLast().benchmarkReturnRate();
        return new AssetTrend(range,List.copyOf(points),new AssetTrend.Summary(portfolio,benchmark,money(new BigDecimal(portfolio).subtract(new BigDecimal(benchmark)))));
    }
    @Override @Transactional(isolation=Isolation.REPEATABLE_READ)
    public byte[] report(long userId,String traceId){var snapshot=snapshot(userId);byte[] bytes=pdf.render(snapshot.overview(),snapshot.holdings());mapper.audit(userId,traceId);return bytes;}
}
