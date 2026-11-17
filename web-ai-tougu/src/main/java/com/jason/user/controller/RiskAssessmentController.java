package com.jason.user.controller;
import com.jason.auth.security.SessionPrincipal;
import com.jason.common.ResponseDTO;
import com.jason.user.dto.*;
import com.jason.user.service.IRiskAssessmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor
public class RiskAssessmentController {
    private final IRiskAssessmentService service;
    @GetMapping("/risk-questionnaires/active") @PreAuthorize("hasAnyRole('INVESTOR','ADVISOR')")
    public ResponseEntity<ResponseDTO<RiskQuestionnaire>> active() { return ResponseEntity.ok(ResponseDTO.success(service.active())); }
    @PostMapping("/risk-assessments") @PreAuthorize("hasRole('INVESTOR')")
    public ResponseEntity<ResponseDTO<RiskAssessmentResult>> submit(@AuthenticationPrincipal SessionPrincipal user,
        @RequestHeader(value="Idempotency-Key",required=false) String key, @Valid @RequestBody RiskAssessmentRequest body,
        @RequestAttribute("traceId") String traceId) {
        var result=service.submit(user.userId(),key,body,traceId);
        var headers=new HttpHeaders();
        if(result.replayed()) headers.add("Idempotent-Replayed","true");
        return new ResponseEntity<>(result.response(),headers,HttpStatus.CREATED);
    }
}
