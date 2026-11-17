package com.jason.user.controller;
import com.jason.user.dto.RiskProfile;
import com.jason.user.service.IRiskProfileService;
import com.jason.auth.security.SessionPrincipal;
import com.jason.common.ResponseDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/risk-profiles") @RequiredArgsConstructor
public class RiskProfileController {
    private final IRiskProfileService service;
    @GetMapping("/current") @PreAuthorize("hasRole('INVESTOR')")
    public ResponseEntity<ResponseDTO<RiskProfile>> current(@AuthenticationPrincipal SessionPrincipal user) {
        return ResponseEntity.ok(ResponseDTO.success(service.current(user.userId())));
    }
}
