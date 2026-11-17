package com.jason.auth.security;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.UUID;
public class TraceFilter extends OncePerRequestFilter {
    private final boolean demo;
    public TraceFilter(boolean demo) { this.demo=demo; }
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        String trace=request.getHeader("X-Trace-Id");
        if (trace==null || !trace.matches("[A-Za-z0-9_-]{1,64}")) trace=UUID.randomUUID().toString().replace("-","");
        request.setAttribute("traceId",trace); response.setHeader("X-Trace-Id",trace);
        response.setHeader("X-Demo-Environment",Boolean.toString(demo));
        chain.doFilter(request,response);
    }
}
