package com.jason.user.model;
import lombok.Data;
@Data public class IdempotencyRow { private long userId; private String requestPath; private String requestDigest; private String responseDigest; }
