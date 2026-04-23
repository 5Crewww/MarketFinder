package com.paf.Domain.Services;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiter simples em memória para o endpoint de login.
 *
 * Estratégia: janela deslizante de 15 minutos por identificador (nome/email normalizado).
 * Máximo de 5 tentativas falhadas na janela. Um login com sucesso limpa o contador.
 *
 * Nota MVP: estado em memória — reseta com reinício do servidor.
 * Em produção, usar Redis ou Bucket4j distribuído.
 */
@Service
public class LoginRateLimiter {

    private static final int    MAX_FAILURES  = 5;
    private static final Duration WINDOW      = Duration.ofMinutes(15);

    // Por identificador → deque de timestamps de tentativas falhadas
    private final ConcurrentHashMap<String, Deque<Instant>> failureMap = new ConcurrentHashMap<>();

    /**
     * Verifica se o identificador está bloqueado (>= MAX_FAILURES na janela).
     * @return true se deve ser bloqueado (429 Too Many Requests).
     */
    public boolean isBlocked(String identifier) {
        String key = normalizeKey(identifier);
        if (key == null) return false;

        Deque<Instant> timestamps = failureMap.get(key);
        if (timestamps == null) return false;

        synchronized (timestamps) {
            purgeOld(timestamps);
            return timestamps.size() >= MAX_FAILURES;
        }
    }

    /**
     * Regista uma tentativa de login falhada.
     */
    public void recordFailure(String identifier) {
        String key = normalizeKey(identifier);
        if (key == null) return;

        failureMap.compute(key, (k, existing) -> {
            Deque<Instant> timestamps = (existing != null) ? existing : new ArrayDeque<>();
            synchronized (timestamps) {
                purgeOld(timestamps);
                timestamps.addLast(Instant.now());
            }
            return timestamps;
        });
    }

    /**
     * Limpa o contador após um login bem-sucedido.
     */
    public void clearOnSuccess(String identifier) {
        String key = normalizeKey(identifier);
        if (key != null) {
            failureMap.remove(key);
        }
    }

    /**
     * Devolve quantos segundos falta até o bloqueio levantar
     * (tempo até a tentativa mais antiga sair da janela).
     */
    public long secondsUntilUnblocked(String identifier) {
        String key = normalizeKey(identifier);
        if (key == null) return 0;

        Deque<Instant> timestamps = failureMap.get(key);
        if (timestamps == null || timestamps.isEmpty()) return 0;

        synchronized (timestamps) {
            Instant oldest = timestamps.peekFirst();
            if (oldest == null) return 0;
            Instant unblockAt = oldest.plus(WINDOW);
            long remaining = Duration.between(Instant.now(), unblockAt).toSeconds();
            return Math.max(0, remaining);
        }
    }

    // Remove timestamps que já saíram da janela deslizante.
    // Deve ser chamado dentro de um bloco synchronized(timestamps).
    private void purgeOld(Deque<Instant> timestamps) {
        Instant cutoff = Instant.now().minus(WINDOW);
        while (!timestamps.isEmpty() && timestamps.peekFirst().isBefore(cutoff)) {
            timestamps.pollFirst();
        }
    }

    private String normalizeKey(String identifier) {
        if (identifier == null) return null;
        String trimmed = identifier.trim();
        return trimmed.isBlank() ? null : trimmed.toLowerCase(Locale.ROOT);
    }
}
