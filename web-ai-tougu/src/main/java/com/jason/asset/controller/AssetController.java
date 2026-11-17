package com.jason.asset.controller;
import com.jason.asset.dto.*;
import com.jason.asset.service.IAssetService;
import com.jason.auth.security.SessionPrincipal;
import com.jason.common.ResponseDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor @PreAuthorize("hasRole('INVESTOR')")
public class AssetController {
    private final IAssetService service;
    private final Clock clock;
    @GetMapping("/asset-overviews/current")
    public ResponseEntity<ResponseDTO<AssetOverview>> overview(@AuthenticationPrincipal SessionPrincipal user){return ResponseEntity.ok(ResponseDTO.success(service.overview(user.userId())));}
    @GetMapping("/asset-trends/current")
    public ResponseEntity<ResponseDTO<AssetTrend>> trend(@AuthenticationPrincipal SessionPrincipal user,@RequestParam(defaultValue="1M") String range){return ResponseEntity.ok(ResponseDTO.success(service.trend(user.userId(),range)));}
    @GetMapping(value="/asset-overviews/current/report",produces=MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> report(@AuthenticationPrincipal SessionPrincipal user,@RequestAttribute("traceId") String traceId){
        var name="FundPilot-asset-report-"+LocalDate.now(clock.withZone(ZoneId.of("Asia/Shanghai"))).format(DateTimeFormatter.BASIC_ISO_DATE)+".pdf";
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(name).build().toString()).body(service.report(user.userId(),traceId));
    }
}
