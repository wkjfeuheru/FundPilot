package com.jason.auth.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record LoginRequest(
    @NotBlank(message = "请输入用户名") @Size(max = 64, message = "用户名不能超过64位") String username,
    @NotBlank(message = "请输入密码") @Size(min = 8, max = 64, message = "密码须为8–64位") String password
) { }
