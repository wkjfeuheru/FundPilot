package com.jason.ta.dto;
import jakarta.validation.constraints.*;
import com.jason.trade.dto.TradeQuery;
public record TaQuery(@Pattern(regexp="PENDING_TA|CONFIRMED|FAILED") String status,@Min(1) Integer page,@Min(1) @Max(100) Integer size){
    public TradeQuery trades(){return new TradeQuery(null,status==null?"PENDING_TA":status,null,null,page,size);}
    public int pageNumber(){return page==null?1:page;}
    public int pageSize(){return size==null?20:size;}
    public long offset(){return (long)(pageNumber()-1)*pageSize();}
}
