package com.jason.auth.security;
import com.jason.exception.*;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
public class ServiceBoundaryFilter extends OncePerRequestFilter {
    private final boolean taEnabled;
    private final String internalToken;
    private final ApiProblems problems;
    public ServiceBoundaryFilter(boolean taEnabled,String internalToken,ApiProblems problems) {this.taEnabled=taEnabled;this.internalToken=internalToken;this.problems=problems;}
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        String path=request.getRequestURI().substring(request.getContextPath().length());
        if((path.equals("/api/v1/ta") || path.startsWith("/api/v1/ta/")) && !taEnabled) {
            problems.write(request,response,ErrorCode.TA_DISABLED);return;
        }
        if(path.equals("/api/v1/agent/tools") || path.startsWith("/api/v1/agent/tools/")) {
            String token=request.getHeader("X-Internal-Token");
            if(internalToken.isBlank() || token==null || !MessageDigest.isEqual(internalToken.getBytes(StandardCharsets.UTF_8),token.getBytes(StandardCharsets.UTF_8))) {
                problems.write(request,response,ErrorCode.AUTH_INTERNAL_TOKEN_INVALID);return;
            }
        }
        chain.doFilter(request,response);
    }
}
