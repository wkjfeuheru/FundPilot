package com.jason.auth.controller;
import com.jason.auth.dto.*;
import com.jason.auth.security.SessionPrincipal;
import com.jason.auth.service.*;
import com.jason.common.ResponseDTO;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
@RestController @RequiredArgsConstructor
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final IAuthService auth;
    private final AuthSessionService sessions;
    @GetMapping("/csrf")
    public ResponseEntity<ResponseDTO<CsrfTokenResult>> csrf(CsrfToken token) {
        return ResponseEntity.ok(ResponseDTO.success(new CsrfTokenResult(token.getToken(),token.getHeaderName())));
    }
    @PostMapping("/sessions")
    public ResponseEntity<ResponseDTO<LoginResult>> login(@Valid @RequestBody LoginRequest input,HttpServletRequest request,HttpServletResponse response) {
        return ResponseEntity.ok(ResponseDTO.success(sessions.login(input,request,response)));
    }
    @DeleteMapping("/sessions/current")
    public ResponseEntity<Void> logout(HttpServletRequest request,HttpServletResponse response) {
        sessions.logout(request,response); return ResponseEntity.noContent().build();
    }
    @GetMapping("/me") @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ResponseDTO<UserProfile>> me(@AuthenticationPrincipal SessionPrincipal principal) {
        return ResponseEntity.ok(ResponseDTO.success(auth.currentUser(principal.userId())));
    }
    @PostMapping("/registrations")
    public ResponseEntity<ResponseDTO<RegistrationResult>> register(@Valid @RequestBody RegistrationRequest input,HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ResponseDTO.success(auth.register(input,(String)request.getAttribute("traceId"))));
    }
}
