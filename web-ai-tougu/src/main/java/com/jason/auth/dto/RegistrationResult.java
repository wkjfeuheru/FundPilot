package com.jason.auth.dto;
public record RegistrationResult(long userId, String username, String displayName, Role role, String customerCode, String initialCash) { }
