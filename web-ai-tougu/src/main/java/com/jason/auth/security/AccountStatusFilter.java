package com.jason.auth.security;
import com.jason.auth.service.IAuthService;
import com.jason.exception.*;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.dao.DataAccessException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
public class AccountStatusFilter extends OncePerRequestFilter {
    private final IAuthService auth;
    private final ApiProblems problems;
    public AccountStatusFilter(IAuthService auth,ApiProblems problems) { this.auth=auth; this.problems=problems; }
    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        String path=request.getRequestURI().substring(request.getContextPath().length());
        return !path.startsWith("/api/v1/") || path.startsWith("/api/v1/ta/") || path.startsWith("/api/v1/agent/tools/")
            || path.equals("/api/v1/auth/sessions") || path.equals("/api/v1/auth/registrations") || path.equals("/api/v1/auth/sessions/current");
    }
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        var authentication=SecurityContextHolder.getContext().getAuthentication();
        if(authentication!=null && authentication.getPrincipal() instanceof SessionPrincipal principal) {
            try {
                var user=auth.currentUser(principal.userId());
                if(user.role()!=principal.role()) throw new BusinessException(ErrorCode.AUTH_SESSION_EXPIRED);
            } catch(BusinessException ex) {
                var session=request.getSession(false);
                if(session!=null) session.invalidate();
                SecurityContextHolder.clearContext();
                problems.write(request,response,ex.getErrorCode()); return;
            } catch(DataAccessException ex) {
                problems.write(request,response,ErrorCode.DATABASE_UNAVAILABLE); return;
            }
        }
        chain.doFilter(request,response);
    }
}
