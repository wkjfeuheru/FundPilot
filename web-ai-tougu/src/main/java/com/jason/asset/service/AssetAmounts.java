package com.jason.asset.service;
import java.math.*;
public final class AssetAmounts {
    private AssetAmounts() {}
    public static String money(BigDecimal v){return v.setScale(2,RoundingMode.HALF_UP).toPlainString();}
    public static BigDecimal percent(BigDecimal numerator,BigDecimal denominator){return denominator.signum()==0?BigDecimal.ZERO.setScale(2):numerator.multiply(BigDecimal.valueOf(100)).divide(denominator,2,RoundingMode.HALF_UP);}
}
