package com.jason.auth.dto;
public record LoginResult(UserProfile user, String csrfToken, String csrfHeaderName) { }
