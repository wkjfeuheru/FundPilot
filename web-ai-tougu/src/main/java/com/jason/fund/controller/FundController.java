package com.jason.fund.controller;
import com.jason.auth.security.SessionPrincipal;
import com.jason.auth.dto.Role;
import com.jason.common.ResponseDTO;
import com.jason.fund.dto.*;
import com.jason.fund.service.IFundService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor
public class FundController {
    private final IFundService service;
    @GetMapping("/funds") @PreAuthorize("hasRole('INVESTOR')")
    public ResponseEntity<ResponseDTO<FundList>> list(@AuthenticationPrincipal SessionPrincipal user,@Valid @ModelAttribute FundQuery query) {
        return ResponseEntity.ok(ResponseDTO.success(service.list(user.userId(),query,false)));
    }
    @GetMapping("/funds/{id}") @PreAuthorize("hasAnyRole('INVESTOR','ADVISOR')")
    public ResponseEntity<ResponseDTO<FundDetail>> detail(@AuthenticationPrincipal SessionPrincipal user,@PathVariable @Positive long id) {
        return ResponseEntity.ok(ResponseDTO.success(service.detail(user.role()==Role.ADVISOR?0:user.userId(),id)));
    }
    @GetMapping("/funds/{id}/navs") @PreAuthorize("hasAnyRole('INVESTOR','ADVISOR')")
    public ResponseEntity<ResponseDTO<NavSeries>> navs(@AuthenticationPrincipal SessionPrincipal user,@PathVariable @Positive long id,@Valid @ModelAttribute NavQuery query) {
        return ResponseEntity.ok(ResponseDTO.success(service.navs(user.userId(),id,query)));
    }
    @GetMapping("/favorites") @PreAuthorize("hasRole('INVESTOR')")
    public ResponseEntity<ResponseDTO<FundList>> favorites(@AuthenticationPrincipal SessionPrincipal user) {
        return ResponseEntity.ok(ResponseDTO.success(service.list(user.userId(),new FundQuery(null,null,null,false),true)));
    }
    public record FavoriteState(long fundId,boolean isFavorite) {}
    @PutMapping("/favorites/{id}") @PreAuthorize("hasRole('INVESTOR')")
    public ResponseEntity<ResponseDTO<FavoriteState>> add(@AuthenticationPrincipal SessionPrincipal user,@PathVariable @Positive long id) {
        service.setFavorite(user.userId(),id,true);return ResponseEntity.ok(ResponseDTO.success(new FavoriteState(id,true)));
    }
    @DeleteMapping("/favorites/{id}") @PreAuthorize("hasRole('INVESTOR')")
    public ResponseEntity<Void> remove(@AuthenticationPrincipal SessionPrincipal user,@PathVariable @Positive long id) {
        service.setFavorite(user.userId(),id,false);return ResponseEntity.noContent().build();
    }
}
