package com.jason.trade.mapper;
import org.apache.ibatis.annotations.*;
import com.jason.trade.model.*;
import java.util.List;
import java.math.BigDecimal;
import java.time.LocalDate;
@Mapper public interface SettlementMapper {
    @Select("SELECT * FROM trade_order WHERE id=#{id} AND user_id=#{userId} AND deleted_at='1970-01-01 00:00:00.000' FOR UPDATE")
    OrderRow lockOrder(@Param("userId") long userId,@Param("id") long id);
    List<SettlementFund> funds(@Param("ids") List<Long> ids,@Param("date") LocalDate date);
    List<HoldingRow> holdings(@Param("userId") long userId,@Param("ids") List<Long> ids);
    void saveHoldings(@Param("rows") List<HoldingRow> rows);
    void confirmItems(@Param("items") List<ItemRow> items);
    @Update("UPDATE cash_account SET cash_balance=cash_balance+#{delta},version=version+1 WHERE user_id=#{userId} AND cash_balance+#{delta}>=0")
    int cash(@Param("userId") long userId,@Param("delta") BigDecimal delta);
    @Update("UPDATE trade_order SET status=#{status},version=version+1 WHERE id=#{id} AND status=1")
    int complete(@Param("id") long id,@Param("status") int status);
    void receipt(ReceiptRow row);
    void audit(@Param("orderId") long orderId,@Param("code") String code,@Param("detail") String detail,@Param("traceId") String traceId);
    void event(@Param("orderId") long orderId,@Param("type") String type,@Param("payload") String payload);
}
