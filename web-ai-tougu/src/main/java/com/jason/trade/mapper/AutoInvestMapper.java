package com.jason.trade.mapper;
import com.jason.trade.model.*;
import com.jason.trade.dto.AutoInvestRequest;
import org.apache.ibatis.annotations.*;
import java.util.List;
@Mapper public interface AutoInvestMapper {
    AutoInvestRow plan(long userId);
    List<AutoInvestFundRow> funds(long planId);
    int countFunds(@Param("ids") List<Long> ids);
    void upsert(@Param("userId") long userId,@Param("r") AutoInvestRequest r);
    void retireFunds(long planId);
    void replaceFunds(@Param("planId") long planId,@Param("funds") List<AutoInvestRequest.Fund> funds);
    void audit(@Param("userId") long userId,@Param("planId") long planId,@Param("detail") String detail,@Param("traceId") String traceId);
}
