package com.jason.platform.controller;
import com.jason.common.ResponseDTO;
import com.jason.platform.dto.BusinessDay;
import com.jason.platform.service.TradingCalendar;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/trading-days") @RequiredArgsConstructor
public class BusinessDayController {
    private final TradingCalendar calendar;
    @GetMapping("/current")
    public ResponseEntity<ResponseDTO<BusinessDay>> current(){return ResponseEntity.ok(ResponseDTO.success(calendar.current()));}
}
