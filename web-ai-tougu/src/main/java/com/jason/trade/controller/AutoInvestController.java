package com.jason.trade.controller;
import com.jason.auth.security.SessionPrincipal;
import com.jason.common.ResponseDTO;
import com.jason.trade.dto.*;
import com.jason.trade.service.IAutoInvestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/auto-invest-plans/current") @RequiredArgsConstructor @PreAuthorize("hasRole('INVESTOR')")
public class AutoInvestController {
    private final IAutoInvestService service;
    @GetMapping public ResponseEntity<ResponseDTO<AutoInvestPlan>> current(@AuthenticationPrincipal SessionPrincipal user){return ResponseEntity.ok(ResponseDTO.success(service.current(user.userId())));}
    @PutMapping public ResponseEntity<ResponseDTO<AutoInvestPlan>> save(@AuthenticationPrincipal SessionPrincipal user,@RequestHeader(value="Idempotency-Key",required=false) String key,
        @Valid @RequestBody AutoInvestRequest request,@RequestAttribute("traceId") String traceId){
        var result=service.save(user.userId(),key,request,traceId);var headers=new HttpHeaders();if(result.replayed())headers.set("Idempotent-Replayed","true");
        return new ResponseEntity<>(result.response(),headers,HttpStatus.OK);
    }
}
