package com.jason.platform.service;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import com.jason.exception.*;
public final class OrderCodeGenerator {
    private OrderCodeGenerator() {}
    /** The database auto-increment sequence never resets between business days. */
    public static String trade(LocalDate date,long sequence){
        String code="T-"+date.format(DateTimeFormatter.BASIC_ISO_DATE)+"-"+String.format(java.util.Locale.ROOT,"%03d",sequence);
        if(code.length()>20)throw new BusinessException(ErrorCode.CONFLICT,"委托序号已超出容量");
        return code;
    }
}
