package com.jason.ta.dto;
import jakarta.validation.constraints.*;
import java.util.List;
public record ReceiptBatchRequest(@Size(min=1,max=100) List<@NotNull @Positive Long> orderIds,@NotBlank @Pattern(regexp="SUCCESS") String result){}
