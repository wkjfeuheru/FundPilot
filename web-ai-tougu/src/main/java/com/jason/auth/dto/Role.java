package com.jason.auth.dto;
public enum Role {
    INVESTOR(1), ADVISOR(2);
    private final int databaseValue;
    Role(int databaseValue) { this.databaseValue = databaseValue; }
    public int databaseValue() { return databaseValue; }
    public static Role fromDatabase(int value) {
        return switch (value) { case 1 -> INVESTOR; case 2 -> ADVISOR; default -> throw new IllegalArgumentException("未知账号角色"); };
    }
}
