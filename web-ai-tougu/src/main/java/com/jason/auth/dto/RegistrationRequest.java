package com.jason.auth.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
public record RegistrationRequest(
    @NotBlank(message = "请输入用户名") @Size(max = 64, message = "用户名不能超过64位") String username,
    @NotBlank(message = "请输入密码") @Size(min = 8, max = 64, message = "密码须为8–64位") String password,
    @NotBlank(message = "请输入展示姓名") @Size(max = 64, message = "展示姓名不能超过64位") String displayName,
    @NotBlank(message = "请选择角色") @Pattern(regexp = "INVESTOR|ADVISOR", message = "仅支持投资者或投顾角色") String role
) { }
