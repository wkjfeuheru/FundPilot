package com.jason.auth.security;
import com.jason.auth.dto.Role;
import java.io.Serializable;
public record SessionPrincipal(long userId, String username, Role role) implements Serializable { }
