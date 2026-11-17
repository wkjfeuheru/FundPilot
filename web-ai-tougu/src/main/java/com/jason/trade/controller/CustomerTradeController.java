package com.jason.trade.controller;
import com.jason.auth.security.SessionPrincipal;
import com.jason.client.service.IClientAccessService;
import com.jason.common.*;
import com.jason.trade.dto.*;
import com.jason.trade.service.ITradeService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/customers") @RequiredArgsConstructor @PreAuthorize("hasRole('ADVISOR')")
public class CustomerTradeController {
    private final ITradeService trades;
    private final IClientAccessService access;
    @GetMapping("/{customerId}/trade-orders")
    public ResponseEntity<ResponseDTO<PageResponse<TradeOrderSummary>>> orders(@AuthenticationPrincipal SessionPrincipal user,
        @PathVariable @Positive long customerId,@Valid @ModelAttribute TradeQuery query){
        access.assertAssigned(user.userId(),customerId);
        return ResponseEntity.ok(ResponseDTO.success(trades.orders(customerId,query)));
    }
}
