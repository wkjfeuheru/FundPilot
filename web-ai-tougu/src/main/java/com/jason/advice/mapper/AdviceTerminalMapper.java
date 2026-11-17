package com.jason.advice.mapper;
import org.apache.ibatis.annotations.*;
import java.util.List;
@Mapper
public interface AdviceTerminalMapper {
    int complete(@Param("orders") List<Long> orders);
}
