package com.jason.trade.dto;
import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.deser.std.StdScalarDeserializer;

/** Reject JSON numeric tokens instead of silently coercing money through a floating-point client value. */
public class AmountStringDeserializer extends StdScalarDeserializer<String> {
    public AmountStringDeserializer(){super(String.class);}
    @Override public String deserialize(JsonParser parser,DeserializationContext context){
        if(!parser.hasToken(JsonToken.VALUE_STRING))return context.reportInputMismatch(String.class,"金额必须为字符串");
        return parser.getString();
    }
}
