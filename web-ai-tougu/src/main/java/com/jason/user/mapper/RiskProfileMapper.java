package com.jason.user.mapper;
import com.jason.user.model.RiskProfileRow;
import org.apache.ibatis.annotations.Mapper;
@Mapper public interface RiskProfileMapper { RiskProfileRow find(long id); }
