package com.jason.trade.mapper;
import com.jason.trade.model.*;
import com.jason.trade.dto.TradeQuery;
import org.apache.ibatis.annotations.*;
import java.util.List;
@Mapper public interface TradeMapper {
    CashRow cash(@Param("userId") long userId);
    @Select("SELECT user_id FROM cash_account WHERE user_id=#{userId} AND deleted_at='1970-01-01 00:00:00.000' FOR UPDATE")
    Long lockCash(long userId);
    void insertOrder(OrderRow row);
    void insertItem(@Param("orderId") long orderId,@Param("fundId") long fundId,@Param("amount") java.math.BigDecimal amount,@Param("fee") java.math.BigDecimal fee);
    @Update("UPDATE trade_order SET order_code=#{code} WHERE id=#{id}")
    void setOrderCode(@Param("id") long id,@Param("code") String code);
    void audit(@Param("userId") long userId,@Param("orderId") long orderId,@Param("code") String code,@Param("detail") String detail,@Param("traceId") String traceId);
    List<OrderRow> orders(@Param("userId") long userId,@Param("q") TradeQuery q);
    long count(@Param("userId") long userId,@Param("q") TradeQuery q);
    OrderRow order(@Param("userId") long userId,@Param("id") long id);
    List<ItemRow> items(@Param("ids") List<Long> ids);
    List<ReceiptRow> receipts(@Param("ids") List<Long> ids);
    @Insert("INSERT INTO idempotency_key(idem_key,user_id,request_path,request_digest,expires_at) VALUES(#{key},#{userId},#{path},#{digest},DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 7 DAY))")
    void claim(@Param("key") String key,@Param("userId") long userId,@Param("path") String path,@Param("digest") String digest);
    @Select("SELECT * FROM idempotency_key WHERE idem_key=#{key} FOR UPDATE")
    PurchaseKeyRow key(String key);
    @Update("UPDATE idempotency_key SET response_digest=#{digest} WHERE id=#{id}")
    void responseDigest(@Param("id") long id,@Param("digest") String digest);
}
