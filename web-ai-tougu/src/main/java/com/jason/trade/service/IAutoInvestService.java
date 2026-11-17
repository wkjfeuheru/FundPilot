package com.jason.trade.service;
import com.jason.common.ResponseDTO;
import com.jason.trade.dto.*;
public interface IAutoInvestService {
    record Submission(ResponseDTO<AutoInvestPlan> response,boolean replayed) {}
    AutoInvestPlan current(long userId);
    Submission save(long userId,String key,AutoInvestRequest request,String traceId);
}
