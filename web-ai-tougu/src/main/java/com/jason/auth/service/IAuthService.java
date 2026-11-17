package com.jason.auth.service;
import com.jason.auth.dto.*;
public interface IAuthService {
    RegistrationResult register(RegistrationRequest input, String traceId);
    UserProfile authenticate(LoginRequest input, String ip, String traceId);
    UserProfile currentUser(long userId);
}
