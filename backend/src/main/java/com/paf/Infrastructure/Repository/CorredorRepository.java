package com.paf.Infrastructure.Repository;

import com.paf.Infrastructure.Entities.CorredorEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CorredorRepository extends JpaRepository<CorredorEntity, Long> {

    @EntityGraph(attributePaths = {"store"})
    Optional<CorredorEntity> findByIdAndStoreId(Long id, Long storeId);

    @EntityGraph(attributePaths = {"store"})
    List<CorredorEntity> findByStoreIdOrderByNomeAsc(Long storeId);

    @EntityGraph(attributePaths = {"store"})
    List<CorredorEntity> findByStoreIdAndNomeContainingIgnoreCaseOrderByNomeAsc(Long storeId, String nome);
}
