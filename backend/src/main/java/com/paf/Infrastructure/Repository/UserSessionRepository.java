package com.paf.Infrastructure.Repository;

import com.paf.Infrastructure.Entities.UserSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface UserSessionRepository extends JpaRepository<UserSessionEntity, Long> {
    Optional<UserSessionEntity> findBySessionTokenAndActiveTrue(String sessionToken);

    long deleteByExpiresAtBeforeOrActiveFalse(Instant expiresAt);
}
