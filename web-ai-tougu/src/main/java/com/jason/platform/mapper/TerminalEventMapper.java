package com.jason.platform.mapper;

import org.apache.ibatis.annotations.*;
import java.util.List;

@Mapper
public interface TerminalEventMapper {
    record Event(long id, long aggregateId, String eventType, Integer orderStatus, Long adviceId,
                 Long customerId, Integer adviceStatus, Long adviceCustomerId) {}
    @Insert("INSERT IGNORE INTO processor_lease(processor_name,lease_owner,lease_expires_at) VALUES('trade-terminal','',UTC_TIMESTAMP(3))")
    void initializeLease();
    @Update("UPDATE processor_lease SET lease_owner=#{owner},lease_expires_at=DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 30 SECOND) WHERE processor_name='trade-terminal' AND (lease_expires_at<=UTC_TIMESTAMP(3) OR lease_owner=#{owner})")
    int acquire(String owner);
    List<Event> due();
    void delivered(@Param("ids") List<Long> ids);
    void retry(@Param("ids") List<Long> ids);
    @Update("UPDATE processor_lease SET lease_expires_at=UTC_TIMESTAMP(3) WHERE processor_name='trade-terminal' AND lease_owner=#{owner}")
    void release(String owner);
}
