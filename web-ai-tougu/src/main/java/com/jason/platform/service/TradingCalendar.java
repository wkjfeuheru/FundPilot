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
    public LocalDate businessDate(){return LocalDate.now(ZoneId.of("Asia/Shanghai"));}
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
