package com.jason.auth.model;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
@Getter @Setter
public class AuthAccount {
    private Long id;
    private String username;
    private String passwordHash;
    private String displayName;
    private int role;
    private int status;
    private boolean securityVerified;
    private Instant createdAt;
    private Instant deletedAt;
    private Integer riskLevel;
    private String accountType;
}
