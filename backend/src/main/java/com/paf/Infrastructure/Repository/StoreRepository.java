package com.paf.Infrastructure.Repository;

import com.paf.Infrastructure.Entities.StoreEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StoreRepository extends JpaRepository<StoreEntity, Long> {
    List<StoreEntity> findByOwnerIdOrderByIdAsc(Long ownerId);
    List<StoreEntity> findByMembershipsUserIdOrderByNameAsc(Long userId);
    List<StoreEntity> findAllByOrderByNameAsc();
}
