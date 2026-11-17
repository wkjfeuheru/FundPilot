package com.jason.client.mapper;
import org.apache.ibatis.annotations.*;
@Mapper
public interface ClientAccessMapper {
    @Select("""
        SELECT COUNT(*) FROM advisor_customer_relation r
        JOIN user u ON u.id=r.customer_user_id AND u.role=1 AND u.status=1 AND u.deleted_at='1970-01-01 00:00:00'
        JOIN customer c ON c.user_id=u.id AND c.deleted_at='1970-01-01 00:00:00'
        WHERE r.advisor_user_id=#{advisorId} AND r.customer_user_id=#{customerId}
        AND r.status=1 AND r.deleted_at='1970-01-01 00:00:00'
        """)
    int countActive(@Param("advisorId")long advisorId,@Param("customerId")long customerId);
}
