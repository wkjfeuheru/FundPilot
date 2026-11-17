package com.jason.platform.mapper;
import org.apache.ibatis.annotations.*;
import java.time.LocalDate;
import java.util.List;
@Mapper public interface TradingCalendarMapper {
    record Day(LocalDate calDate,boolean isTradingDay) {}
    @Select("SELECT cal_date,is_trading_day FROM trading_day WHERE cal_date BETWEEN #{from} AND #{to} ORDER BY cal_date")
    List<Day> days(@Param("from") LocalDate from,@Param("to") LocalDate to);
}
