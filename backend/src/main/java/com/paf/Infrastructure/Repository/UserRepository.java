package com.paf.Infrastructure.Repository;

import com.paf.Infrastructure.Entities.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByNomeIgnoreCase(String nome);
    Optional<UserEntity> findByEmailIgnoreCase(String email);
    Optional<UserEntity> findByNomeIgnoreCaseOrEmailIgnoreCase(String nome, String email);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByNomeIgnoreCase(String nome);
    boolean existsByRoleIgnoreCase(String role);
}
