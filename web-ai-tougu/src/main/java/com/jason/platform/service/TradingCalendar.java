package com.jason.platform.service;
import com.jason.platform.mapper.TradingCalendarMapper;
import com.jason.exception.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.time.*;
import java.util.stream.Collectors;
@Service @RequiredArgsConstructor @Slf4j
public class TradingCalendar {
    private final TradingCalendarMapper mapper;
    private final Clock clock;
    public LocalDate businessDate(){return LocalDate.now(clock.withZone(ZoneId.of("Asia/Shanghai")));}
    public com.jason.platform.dto.BusinessDay current(){
        var today=businessDate();
        var days=mapper.days(today.minusDays(366),today.plusDays(366)).stream().collect(Collectors.toMap(TradingCalendarMapper.Day::calDate,TradingCalendarMapper.Day::isTradingDay));
        LocalDate previous=null,next=null;
        for(int i=1;i<=366 && (previous==null || next==null);i++){
            if(previous==null && trading(days,today.minusDays(i)))previous=today.minusDays(i);
            if(next==null && trading(days,today.plusDays(i)))next=today.plusDays(i);
        }
        if(previous==null || next==null)throw new BusinessException(ErrorCode.CONFLICT,"交易日历缺少相邻交易日");
        return new com.jason.platform.dto.BusinessDay(today,trading(days,today),previous,next,"Asia/Shanghai",clock.instant());
    }
    private boolean trading(java.util.Map<LocalDate,Boolean> days,LocalDate day){
        Boolean result=days.get(day);
        if(result==null){log.warn("Trading calendar missing {}; using weekday fallback",day);return day.getDayOfWeek().getValue()<=5;}
        return result;
    }
    public LocalDate nextOrSame(LocalDate day){
        var calendar=mapper.days(day,day.plusDays(366)).stream().collect(Collectors.toMap(TradingCalendarMapper.Day::calDate,TradingCalendarMapper.Day::isTradingDay));
        for(int i=0;i<=366;i++){
            LocalDate candidate=day.plusDays(i);Boolean trading=calendar.get(candidate);
            if(trading==null){log.warn("Trading calendar missing {}; using weekday fallback",candidate);trading=candidate.getDayOfWeek().getValue()<=5;}
            if(trading)return candidate;
        }
        throw new BusinessException(ErrorCode.CONFLICT,"交易日历缺少后续交易日");
    }
}
