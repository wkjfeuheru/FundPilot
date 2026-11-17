package com.jason.fund.service;
import com.jason.fund.dto.*;
public interface IFundService {
    FundList list(long userId,FundQuery query,boolean favoritesOnly);
    FundDetail detail(long userId,long fundId);
    NavSeries navs(long userId,long fundId,NavQuery query);
    void setFavorite(long userId,long fundId,boolean favorite);
}
