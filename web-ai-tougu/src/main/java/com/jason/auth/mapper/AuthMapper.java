package com.jason.auth.mapper;
import com.jason.auth.model.AuthAccount;
import org.apache.ibatis.annotations.*;
import java.math.BigDecimal;
@Mapper
public interface AuthMapper {
    @Select("SELECT * FROM user WHERE username=#{username}")
    AuthAccount findByUsername(String username);
    @Select("""
        SELECT u.*, u.is_security_verified AS security_verified, rp.risk_level, rp.account_type
        FROM user u LEFT JOIN risk_profile rp ON rp.user_id=u.id AND u.role=1 AND rp.deleted_at='1970-01-01 00:00:00'
        WHERE u.id=#{id}
        """)
    AuthAccount findById(long id);
    @Insert("INSERT INTO user(username,password_hash,display_name,role) VALUES(#{username},#{passwordHash},#{displayName},#{role})")
    @Options(useGeneratedKeys=true, keyProperty="id")
    void insertUser(AuthAccount account);
    @Insert("INSERT INTO customer(user_id,customer_code) VALUES(#{userId},#{code})")
    void insertCustomer(@Param("userId") long userId, @Param("code") String code);
    @Insert("INSERT INTO cash_account(user_id,cash_balance) VALUES(#{userId},#{cash})")
    void insertCashAccount(@Param("userId") long userId, @Param("cash") BigDecimal cash);
    @Insert("""
        INSERT INTO audit_log(actor_user_id,actor_role,action,object_type,object_id,object_name,trace_id,occurred_at)
        VALUES(#{userId},#{role},#{action},'user',#{userId},#{username},#{traceId},UTC_TIMESTAMP(3))
        """)
    void insertAudit(@Param("userId") long userId, @Param("role") int role, @Param("action") int action,
                     @Param("username") String username, @Param("traceId") String traceId);
}
