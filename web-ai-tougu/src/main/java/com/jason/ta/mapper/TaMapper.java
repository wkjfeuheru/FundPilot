package com.jason.ta.mapper;
import org.apache.ibatis.annotations.*;
import com.jason.ta.dto.TaQuery;
import com.jason.trade.model.OrderRow;
import java.util.List;
@Mapper public interface TaMapper {
    @Select("SELECT display_name FROM user WHERE id=#{id} AND role=1 AND status=1 AND deleted_at='1970-01-01 00:00:00.000'")
    String customerName(long id);
    @Select("SELECT COUNT(*) FROM trade_order WHERE user_id=#{id} AND status=1 AND deleted_at='1970-01-01 00:00:00.000'")
    long pending(long id);
    List<OrderRow> orders(@Param("userId") long userId,@Param("q") TaQuery q);
    List<Long> pendingIds(@Param("userId") long userId);
    List<Long> scopedIds(@Param("userId") long userId,@Param("ids") List<Long> ids);
    List<OrderRow> receiptedOrders(@Param("userId") long userId,@Param("q") TaQuery q);
    @Select("SELECT COUNT(*) FROM ta_receipt r JOIN trade_order o ON o.id=r.order_id WHERE o.user_id=#{id} AND o.deleted_at='1970-01-01 00:00:00.000'")
    long receiptCount(long id);
    void batchAudit(@Param("id") long id,@Param("action") int action,@Param("detail") String detail,@Param("traceId") String traceId);
}
