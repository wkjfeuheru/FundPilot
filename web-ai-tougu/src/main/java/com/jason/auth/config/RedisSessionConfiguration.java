package com.jason.auth.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.config.SessionRepositoryCustomizer;
import org.springframework.session.data.redis.RedisSessionRepository;
import org.springframework.session.data.redis.config.annotation.web.http.EnableRedisHttpSession;
import org.springframework.session.web.http.DefaultCookieSerializer;
import java.time.Duration;

@Configuration
@ConditionalOnProperty(name="app.session.backend",havingValue="redis")
@EnableRedisHttpSession(redisNamespace="fundpilot:sessions")
public class RedisSessionConfiguration {
    @Bean
    SessionRepositoryCustomizer<RedisSessionRepository> sessionTimeout(@Value("${server.servlet.session.timeout:30m}") Duration timeout) {
        return repository -> repository.setDefaultMaxInactiveInterval(timeout);
    }
    @Bean
    DefaultCookieSerializer cookieSerializer(@Value("${server.servlet.session.cookie.secure:false}") boolean secure) {
        var serializer=new DefaultCookieSerializer();
        serializer.setCookieName("JSESSIONID");
        serializer.setCookiePath("/");
        serializer.setUseHttpOnlyCookie(true);
        serializer.setUseSecureCookie(secure);
        serializer.setSameSite("Lax");
        serializer.setUseBase64Encoding(false);
        return serializer;
    }
}
