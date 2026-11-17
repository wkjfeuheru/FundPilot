package com.jason.trade.controller;
import com.jason.auth.security.SessionPrincipal;
import com.jason.common.*;
import com.jason.trade.dto.*;
import com.jason.trade.service.ITradeService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor @PreAuthorize("hasRole('INVESTOR')")
public class TradeController {
    private final ITradeService service;
    @PostMapping("/trade-order-quotes/purchases")
    public ResponseEntity<ResponseDTO<PurchaseQuote>> quote(@AuthenticationPrincipal SessionPrincipal user,@Valid @RequestBody PurchaseRequest request){
        return ResponseEntity.ok(ResponseDTO.success(service.quote(user.userId(),request)));
    }
    @PostMapping("/trade-orders/purchases")
    public ResponseEntity<ResponseDTO<TradeOrderDetail>> purchase(@AuthenticationPrincipal SessionPrincipal user,
        @RequestHeader(value="Idempotency-Key",required=false) String key,@Valid @RequestBody PurchaseRequest request,@RequestAttribute("traceId") String traceId){
        var result=service.purchase(user.userId(),key,request,traceId);
        var headers=new HttpHeaders();
        if(result.replayed())headers.add("Idempotent-Replayed","true");
        return new ResponseEntity<>(result.response(),headers,HttpStatus.CREATED);
    }
    @GetMapping("/cash-accounts/current")
    public ResponseEntity<ResponseDTO<CashAccount>> cash(@AuthenticationPrincipal SessionPrincipal user){return ResponseEntity.ok(ResponseDTO.success(service.cash(user.userId())));}
    @GetMapping("/trade-orders")
    public ResponseEntity<ResponseDTO<PageResponse<TradeOrderSummary>>> orders(@AuthenticationPrincipal SessionPrincipal user,@Valid @ModelAttribute TradeQuery query){
        return ResponseEntity.ok(ResponseDTO.success(service.orders(user.userId(),query)));
    }
    @GetMapping("/trade-orders/{id}")
    public ResponseEntity<ResponseDTO<TradeOrderDetail>> detail(@AuthenticationPrincipal SessionPrincipal user,@PathVariable @Positive long id){
        return ResponseEntity.ok(ResponseDTO.success(service.detail(user.userId(),id)));
    }
}
