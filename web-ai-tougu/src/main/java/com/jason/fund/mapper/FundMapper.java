package com.jason.fund.mapper;
import com.jason.fund.model.*;
import org.apache.ibatis.annotations.*;
import java.time.LocalDate;
import java.util.List;
@Mapper
public interface FundMapper {
    List<FundRow> list(@Param("userId") long userId,@Param("type") Integer type,@Param("risk") Integer risk,@Param("keyword") String keyword,@Param("poolOnly") boolean poolOnly,@Param("favoritesOnly") boolean favoritesOnly);
    FundRow find(@Param("id") long id,@Param("userId") long userId);
    List<NavRow> navs(@Param("id") long id,@Param("from") LocalDate from,@Param("to") LocalDate to);
    @Insert("INSERT INTO favorite(user_id,fund_id) VALUES(#{userId},#{fundId}) ON DUPLICATE KEY UPDATE id=id")
    void addFavorite(@Param("userId") long userId,@Param("fundId") long fundId);
    @Delete("DELETE FROM favorite WHERE user_id=#{userId} AND fund_id=#{fundId}")
    void removeFavorite(@Param("userId") long userId,@Param("fundId") long fundId);
}
