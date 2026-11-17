package com.jason.auth.service;
import com.jason.auth.dto.*;
import com.jason.auth.security.SessionPrincipal;
import jakarta.servlet.http.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.stereotype.Service;
import java.util.List;
@Service @RequiredArgsConstructor
public class AuthSessionService {
    private final IAuthService auth;
    private final SecurityContextRepository contexts;
    private final CsrfTokenRepository csrf;
    public LoginResult login(LoginRequest input,HttpServletRequest request,HttpServletResponse response) {
        UserProfile user=auth.authenticate(input,request.getRemoteAddr(),(String)request.getAttribute("traceId"));
        if (request.getSession(false)!=null) request.changeSessionId();
        var context=SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
            new SessionPrincipal(user.id(),user.username(),user.role()),null,List.of(new SimpleGrantedAuthority("ROLE_"+user.role().name()))));
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context,request,response);
        csrf.saveToken(null,request,response);
        var token=csrf.generateToken(request);
        csrf.saveToken(token,request,response);
        return new LoginResult(user,token.getToken(),token.getHeaderName());
    }
    public void logout(HttpServletRequest request,HttpServletResponse response) {
        var session=request.getSession(false);
        if (session!=null) session.invalidate();
        SecurityContextHolder.clearContext();
        response.addHeader("Set-Cookie",ResponseCookie.from("JSESSIONID","").path("/")
            .httpOnly(true).secure(request.isSecure()).sameSite("Lax").maxAge(0).build().toString());
    }
}
