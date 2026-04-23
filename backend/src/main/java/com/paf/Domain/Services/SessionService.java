package com.paf.Domain.Services;

import com.paf.Infrastructure.Entities.UserEntity;
import com.paf.Infrastructure.Entities.UserSessionEntity;
import com.paf.Infrastructure.Repository.UserSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Service
public class SessionService {

    private static final Duration LOJISTA_SESSION_TTL = Duration.ofHours(2);
    private static final Duration CLIENTE_SESSION_TTL = Duration.ofDays(7);
    private static final Duration DEFAULT_SESSION_TTL = Duration.ofHours(8);
    private static final String BEARER_PREFIX = "Bearer ";

    private final UserSessionRepository userSessionRepository;

    @Autowired
    public SessionService(UserSessionRepository userSessionRepository) {
        this.userSessionRepository = userSessionRepository;
    }

    public UserSessionEntity createSession(UserEntity user) {
        UserSessionEntity session = new UserSessionEntity();
        session.setUser(user);
        session.setSessionToken(UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", ""));
        session.setExpiresAt(Instant.now().plus(resolveSessionTtl(user)));
        session.setActive(Boolean.TRUE);
        return userSessionRepository.save(session);
    }

    public UserSessionEntity requireActiveSession(String sessionTokenOrAuthorizationHeader) {
        String sessionToken = normalizeSessionToken(sessionTokenOrAuthorizationHeader);
        if (sessionToken == null || sessionToken.isBlank()) {
            throw new SecurityException("Sessao invalida. Por favor faca login novamente.");
        }

        UserSessionEntity session = userSessionRepository.findBySessionTokenAndActiveTrue(sessionToken).orElse(null);
        if (session == null) {
            throw new SecurityException("Sessao invalida. Por favor faca login novamente.");
        }
        if (session.getExpiresAt().isBefore(Instant.now())) {
            throw new SecurityException("Sessao expirada. Por favor faca login novamente.");
        }

        return session;
    }

    public void invalidate(String sessionTokenOrAuthorizationHeader) {
        String sessionToken = normalizeSessionToken(sessionTokenOrAuthorizationHeader);
        if (sessionToken == null || sessionToken.isBlank()) {
            return;
        }

        userSessionRepository.findBySessionTokenAndActiveTrue(sessionToken).ifPresent(session -> {
            session.setActive(Boolean.FALSE);
            userSessionRepository.save(session);
        });
    }

    @Async
    @Scheduled(
            initialDelayString = "${app.session.cleanup-initial-delay-ms:60000}",
            fixedDelayString = "${app.session.cleanup-interval-ms:900000}"
    )
    public void cleanupExpiredSessions() {
        userSessionRepository.deleteByExpiresAtBeforeOrActiveFalse(Instant.now());
    }

    private String normalizeSessionToken(String sessionTokenOrAuthorizationHeader) {
        if (sessionTokenOrAuthorizationHeader == null) {
            return null;
        }

        String normalizedValue = sessionTokenOrAuthorizationHeader.trim();
        if (normalizedValue.isBlank()) {
            return null;
        }

        if (normalizedValue.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
            String bearerToken = normalizedValue.substring(BEARER_PREFIX.length()).trim();
            return bearerToken.isBlank() ? null : bearerToken;
        }

        return normalizedValue;
    }

    private Duration resolveSessionTtl(UserEntity user) {
        if (user == null || user.getRole() == null) {
            return DEFAULT_SESSION_TTL;
        }

        String normalizedRole = user.getRole().trim().toLowerCase(Locale.ROOT);
        if ("lojista".equals(normalizedRole)) {
            return LOJISTA_SESSION_TTL;
        }
        if ("cliente".equals(normalizedRole) || "user".equals(normalizedRole)) {
            return CLIENTE_SESSION_TTL;
        }
        return DEFAULT_SESSION_TTL;
    }
}
