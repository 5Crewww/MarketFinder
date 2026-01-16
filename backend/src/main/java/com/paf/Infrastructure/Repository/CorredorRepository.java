package com.paf.Infrastructure.Repository;

import com.paf.Infrastructure.Entities.CorredorEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CorredorRepository extends JpaRepository<CorredorEntity, Long> {
    Optional<CorredorEntity> findByNome(String nome);
    List<CorredorEntity> findByIdLoja(Long idLoja);
}
