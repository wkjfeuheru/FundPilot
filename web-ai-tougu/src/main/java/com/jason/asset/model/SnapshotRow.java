package com.jason.asset.model;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
@Data public class SnapshotRow { private LocalDate snapshotDate; private BigDecimal totalAsset; }
