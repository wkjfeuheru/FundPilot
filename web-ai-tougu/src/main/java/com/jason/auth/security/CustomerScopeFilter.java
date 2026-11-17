package com.jason.auth.security;
import com.jason.client.service.IClientAccessService;
import com.jason.exception.*;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.dao.DataAccessException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import org.springframework.http.server.PathContainer;
import org.springframework.web.util.pattern.PathPattern;
import org.springframework.web.util.pattern.PathPatternParser;
public class CustomerScopeFilter extends OncePerRequestFilter {
    private static final PathPattern CUSTOMER=PathPatternParser.defaultInstance.parse("/api/v1/customers/{customerId}/**");
    private final IClientAccessService access;
    private final ApiProblems problems;
    public CustomerScopeFilter(IClientAccessService access,ApiProblems problems) {this.access=access;this.problems=problems;}
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        var match=CUSTOMER.matchAndExtract(PathContainer.parsePath(request.getRequestURI().substring(request.getContextPath().length())));
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(match!=null && auth!=null && auth.getPrincipal() instanceof SessionPrincipal principal) {
            String customerId=match.getUriVariables().get("customerId");
            // Use the same decoded path semantics as MVC, and only exempt the named collection summary.
            if ("summary".equals(customerId)) { chain.doFilter(request,response); return; }
            if (!customerId.matches("[1-9][0-9]*")) { problems.write(request,response,ErrorCode.INVALID_REQUEST); return; }
            try { access.assertAssigned(principal.userId(),Long.parseLong(customerId)); }
            catch(NumberFormatException ex) {problems.write(request,response,ErrorCode.INVALID_REQUEST);return;}
            catch(BusinessException ex) {problems.write(request,response,ex.getErrorCode());return;}
            catch(DataAccessException ex) {problems.write(request,response,ErrorCode.DATABASE_UNAVAILABLE);return;}
        }
        chain.doFilter(request,response);
    }
}
