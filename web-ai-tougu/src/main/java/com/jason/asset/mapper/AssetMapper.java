package com.jason.asset.mapper;
import com.jason.asset.model.*;
import org.apache.ibatis.annotations.*;
import java.time.LocalDate;
import java.util.List;
@Mapper public interface AssetMapper {
    List<HoldingRow> holdings(long userId);
    List<SnapshotRow> snapshots(@Param("userId") long userId,@Param("from") LocalDate from,@Param("to") LocalDate to);
    List<TargetRow> targets(long userId);
    void audit(@Param("userId") long userId,@Param("traceId") String traceId);
}
