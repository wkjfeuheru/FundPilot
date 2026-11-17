package com.jason.config;
import com.jason.auth.config.*;
import com.jason.auth.security.*;
import com.jason.auth.service.IAuthService;
import com.jason.client.service.IClientAccessService;
import com.jason.exception.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.*;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.context.*;
import org.springframework.security.web.csrf.*;

@Configuration @EnableWebSecurity @EnableMethodSecurity
@EnableConfigurationProperties({AuthProperties.class,LoginLimitProperties.class})
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new Argon2PasswordEncoder(16,32,1,19456,2); }
    @Bean SecurityContextRepository securityContextRepository() { return new HttpSessionSecurityContextRepository(); }
    @Bean CsrfTokenRepository csrfTokenRepository() {
        var repository=new HttpSessionCsrfTokenRepository();
        repository.setHeaderName("X-CSRF-Token"); return repository;
    }
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http,SecurityContextRepository contexts,CsrfTokenRepository csrf,
        IAuthService auth,IClientAccessService access,ApiProblems problems,
        @Value("${app.ta.enabled:false}") boolean taEnabled,
        @Value("${app.demo-environment:true}") boolean demo,
        @Value("${app.agent.internal-token:}") String internalToken) throws Exception {
        http.securityContext(context -> context.securityContextRepository(contexts).requireExplicitSave(true))
            .requestCache(cache -> cache.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            .formLogin(form -> form.disable()).httpBasic(basic -> basic.disable()).logout(logout -> logout.disable())
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request,response,ex) -> problems.write(request,response,
                    request.getRequestedSessionId()!=null && !request.isRequestedSessionIdValid() ? ErrorCode.AUTH_SESSION_EXPIRED : ErrorCode.AUTH_UNAUTHENTICATED))
                .accessDeniedHandler((request,response,ex) -> problems.write(request,response,
                    ex instanceof CsrfException ? ErrorCode.CSRF_TOKEN_INVALID : ErrorCode.FORBIDDEN)))
            .csrf(config -> config.csrfTokenRepository(csrf).csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                .ignoringRequestMatchers(request -> {
                    String path=request.getRequestURI().substring(request.getContextPath().length());
                    if(path.equals("/api/v1/auth/sessions") || path.equals("/api/v1/auth/registrations") ||
                       path.startsWith("/api/v1/ta/") || path.startsWith("/api/v1/agent/tools/")) return true;
                    var authentication=SecurityContextHolder.getContext().getAuthentication();
                    return path.equals("/api/v1/auth/sessions/current") && (authentication==null || !(authentication.getPrincipal() instanceof SessionPrincipal));
                }))
            .authorizeHttpRequests(rules -> rules
                .requestMatchers("/api/v1/ping","/api/v1/auth/csrf","/api/v1/auth/sessions","/api/v1/auth/registrations","/api/v1/auth/sessions/current").permitAll()
                .requestMatchers(HttpMethod.GET,"/api/v1/trading-days/current").permitAll()
                .requestMatchers("/api/v1/ta/**","/api/v1/agent/tools/**").permitAll()
                .requestMatchers("/api/v1/customers/**","/api/v1/advisor-dashboards/**","/api/v1/strategies/**",
                    "/api/v1/model-portfolios/**","/api/v1/client-portfolios/**","/api/v1/risk-events/**",
                    "/api/v1/risk-rules/**","/api/v1/reports/**","/api/v1/approval-items/**","/api/v1/audit-logs/**").hasRole("ADVISOR")
                .requestMatchers(HttpMethod.POST,"/api/v1/rebalance-advices").hasRole("ADVISOR")
                .requestMatchers(HttpMethod.GET,"/api/v1/rebalance-advices","/api/v1/funds").hasRole("INVESTOR")
                .requestMatchers("/api/v1/rebalance-advices/*/decisions","/api/v1/risk-profiles/current","/api/v1/risk-assessments",
                    "/api/v1/favorites/**","/api/v1/trade-order-quotes/**","/api/v1/trade-orders/**","/api/v1/cash-accounts/**",
                    "/api/v1/auto-invest-plans/**","/api/v1/asset-overviews/**","/api/v1/asset-trends/**","/api/v1/holdings/**").hasRole("INVESTOR")
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll())
            .addFilterBefore(new TraceFilter(demo),SecurityContextHolderFilter.class)
            .addFilterAfter(new AccountStatusFilter(auth,problems),SecurityContextHolderFilter.class)
            .addFilterBefore(new ServiceBoundaryFilter(taEnabled,internalToken,problems),CsrfFilter.class)
            .addFilterAfter(new CustomerScopeFilter(access,problems),AuthorizationFilter.class);
        return http.build();
    }
}
