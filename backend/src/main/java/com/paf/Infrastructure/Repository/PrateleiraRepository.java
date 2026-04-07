package com.paf.Infrastructure.Repository;

import com.paf.Infrastructure.Entities.PrateleiraEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PrateleiraRepository extends JpaRepository<PrateleiraEntity, Long> {

    @EntityGraph(attributePaths = {"corredor", "corredor.store"})
    List<PrateleiraEntity> findByCorredorStoreIdOrderByNomeAsc(Long storeId);

    @EntityGraph(attributePaths = {"corredor", "corredor.store"})
    List<PrateleiraEntity> findByCorredorStoreIdAndNomeContainingIgnoreCaseOrderByNomeAsc(Long storeId, String nome);

    @EntityGraph(attributePaths = {"corredor", "corredor.store"})
    List<PrateleiraEntity> findByCorredorIdAndCorredorStoreIdOrderByNomeAsc(Long corredorId, Long storeId);

    @EntityGraph(attributePaths = {"corredor", "corredor.store"})
    Optional<PrateleiraEntity> findByIdAndCorredorStoreId(Long id, Long storeId);
}
