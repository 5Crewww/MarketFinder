package com.paf.Infrastructure.Repository;

import com.paf.Infrastructure.Entities.PasswordResetTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, Long> {
    Optional<PasswordResetTokenEntity> findByToken(String token);

    long deleteByUserId(Long userId);

    long deleteByExpiresAtBefore(Instant expiresAt);
}
