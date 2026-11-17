package com.jason.trade.dto;
import jakarta.validation.constraints.*;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
public record TradeQuery(@Pattern(regexp="PURCHASE|REDEMPTION|REBALANCE|AUTO_INVEST|DIVIDEND") String tradeType,
    @Pattern(regexp="PENDING_TA|CONFIRMED|FAILED") String status,
    @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate from,
    @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate to,
    @Min(1) Integer page,@Min(1) @Max(100) Integer size) {
    public int pageNumber(){return page==null?1:page;}
    public int pageSize(){return size==null?20:size;}
    public long offset(){return (long)(pageNumber()-1)*pageSize();}
    public Integer typeCode(){return tradeType==null?null:java.util.List.of("PURCHASE","REDEMPTION","REBALANCE","AUTO_INVEST","DIVIDEND").indexOf(tradeType)+1;}
    public Integer statusCode(){return status==null?null:java.util.List.of("PENDING_TA","CONFIRMED","FAILED").indexOf(status)+1;}
}
