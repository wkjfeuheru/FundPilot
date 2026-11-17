package com.jason.auth.service;
import com.jason.auth.config.AuthProperties;
import com.jason.auth.dto.*;
import com.jason.auth.mapper.AuthMapper;
import com.jason.auth.model.AuthAccount;
import com.jason.exception.BusinessException;
import com.jason.exception.ErrorCode;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.math.RoundingMode;

@Service
public class AuthServiceImpl implements IAuthService {
    private final AuthMapper mapper;
    private final PasswordEncoder encoder;
    private final AuthProperties properties;
    private final LoginRateLimiter limiter;
    private final String dummyHash;
    public AuthServiceImpl(AuthMapper mapper, PasswordEncoder encoder, AuthProperties properties, LoginRateLimiter limiter) {
        this.mapper=mapper; this.encoder=encoder; this.properties=properties; this.limiter=limiter;
        dummyHash=encoder.encode("invalid-account-timing-padding");
    }
    @Override @Transactional
    public RegistrationResult register(RegistrationRequest input, String traceId) {
        if (!properties.isEnabled()) throw new BusinessException(ErrorCode.AUTH_REGISTRATION_DISABLED);
        Role role = Role.valueOf(input.role());
        AuthAccount account = new AuthAccount();
        account.setUsername(input.username().strip());
        account.setDisplayName(input.displayName().strip());
        account.setPasswordHash(encoder.encode(input.password()));
        account.setRole(role.databaseValue());
        try { mapper.insertUser(account); } catch (DuplicateKeyException ex) { throw new BusinessException(ErrorCode.AUTH_USERNAME_TAKEN); }
        String customerCode = null;
        String cash = null;
        if (role == Role.INVESTOR) {
            customerCode = "C" + Long.toString(account.getId(), 36).toUpperCase(java.util.Locale.ROOT);
            mapper.insertCustomer(account.getId(), customerCode);
            mapper.insertCashAccount(account.getId(), properties.getInvestorDemoCash());
            cash = properties.getInvestorDemoCash().setScale(2, RoundingMode.UNNECESSARY).toPlainString();
        }
        mapper.insertAudit(account.getId(), role.databaseValue(), 8, account.getUsername(), traceId);
        return new RegistrationResult(account.getId(), account.getUsername(), account.getDisplayName(), role, customerCode, cash);
    }
    @Override @Transactional
    public UserProfile authenticate(LoginRequest input, String ip, String traceId) {
        String username = input.username().strip();
        AuthAccount account = mapper.findByUsername(username);
        // MySQL's ai_ci collation also equates names such as ß/ss; use its canonical row name for limiting.
        username = account == null ? username : account.getUsername();
        limiter.check(username, ip);
        boolean matches = encoder.matches(input.password(), account == null ? dummyHash : account.getPasswordHash());
        if (!matches || account == null || !Instant.EPOCH.equals(account.getDeletedAt())) {
            limiter.failed(username, ip);
            throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS);
        }
        if (account.getStatus() != 1) throw new BusinessException(ErrorCode.AUTH_ACCOUNT_DISABLED);
        limiter.succeeded(username, ip);
        mapper.insertAudit(account.getId(), account.getRole(), 6, account.getUsername(), traceId);
        return currentUser(account.getId());
    }
    @Override
    public UserProfile currentUser(long userId) {
        AuthAccount account = mapper.findById(userId);
        if (account == null || !Instant.EPOCH.equals(account.getDeletedAt())) throw new BusinessException(ErrorCode.AUTH_SESSION_EXPIRED);
        if (account.getStatus() != 1) throw new BusinessException(ErrorCode.AUTH_ACCOUNT_DISABLED);
        Integer level = account.getRole() == 1 ? account.getRiskLevel() : null;
        String[] labels = {"保守", "稳健", "平衡", "成长", "进取"};
        String type = level == null ? null : labels[level - 1] + "型";
        String risk = level == null ? null : "R" + level;
        return new UserProfile(account.getId(), account.getUsername(), account.getDisplayName(), Role.fromDatabase(account.getRole()),
            "NORMAL", account.isSecurityVerified(), risk, level == null ? null : risk + " " + type, type,
            account.getRole() == 1 ? account.getAccountType() : null, account.getCreatedAt());
    }
}
