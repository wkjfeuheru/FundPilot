package com.jason.ta.controller;
import com.jason.common.*;
import com.jason.ta.dto.*;
import com.jason.ta.service.ITaService;
import com.jason.trade.dto.*;
import com.jason.platform.service.WriteReplay.Reply;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/ta") @RequiredArgsConstructor
public class TaController {
    private final ITaService service;
    @GetMapping("/summary") public ResponseEntity<ResponseDTO<TaSummary>> summary(){return ResponseEntity.ok(ResponseDTO.success(service.summary()));}
    @GetMapping("/trade-orders") public ResponseEntity<ResponseDTO<PageResponse<TaOrderSummary>>> orders(@Valid @ModelAttribute TaQuery q){return ResponseEntity.ok(ResponseDTO.success(service.orders(q)));}
    @GetMapping("/receipts") public ResponseEntity<ResponseDTO<PageResponse<ReceiptView>>> receipts(@Valid @ModelAttribute TaQuery q){return ResponseEntity.ok(ResponseDTO.success(service.receipts(q)));}
    @GetMapping("/trade-orders/{id}/receipt-preview") public ResponseEntity<ResponseDTO<ReceiptPreview>> preview(@PathVariable @Positive long id){return ResponseEntity.ok(ResponseDTO.success(service.preview(id)));}
    @PostMapping("/trade-orders/{id}/ta-receipts")
    public ResponseEntity<ResponseDTO<TradeOrderDetail>> confirm(@PathVariable @Positive long id,@RequestHeader(value="Idempotency-Key",required=false) String key,
        @Valid @RequestBody ReceiptCommand command,@RequestAttribute("traceId") String traceId){return reply(service.confirm(id,key,command,traceId));}
    @PostMapping("/receipt-batches") public ResponseEntity<ResponseDTO<ReceiptBatchResult>> batch(@RequestHeader(value="Idempotency-Key",required=false) String key,
        @Valid @RequestBody ReceiptBatchRequest command,@RequestAttribute("traceId") String traceId){return reply(service.batch(key,command,traceId));}
    private <T>ResponseEntity<ResponseDTO<T>> reply(Reply<T> result){
        var headers=new HttpHeaders();if(result.replayed())headers.add("Idempotent-Replayed","true");
        return new ResponseEntity<>(result.response(),headers,HttpStatus.OK);
    }
}
