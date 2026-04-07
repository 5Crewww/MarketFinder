package com.paf.Config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class SecurityHeadersFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("Referrer-Policy", "no-referrer");
        response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
        response.setHeader("Content-Security-Policy",
                "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; "
                        + "img-src 'self' data: http: https:; font-src 'self' data: https://fonts.gstatic.com; "
                        + "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'");
        response.setHeader("Cache-Control", "no-store");
        filterChain.doFilter(request, response);
    }
}
