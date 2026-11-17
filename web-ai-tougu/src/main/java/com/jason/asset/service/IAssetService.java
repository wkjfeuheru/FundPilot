package com.jason.asset.service;
import com.jason.asset.dto.*;
public interface IAssetService {
    AssetOverview overview(long userId);
    Holdings holdings(long userId);
    AssetTrend trend(long userId,String range);
    byte[] report(long userId,String traceId);
}
