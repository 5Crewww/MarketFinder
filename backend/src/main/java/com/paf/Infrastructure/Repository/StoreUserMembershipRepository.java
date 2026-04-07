package com.paf.Infrastructure.Repository;

import com.paf.Infrastructure.Entities.StoreUserMembershipEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StoreUserMembershipRepository extends JpaRepository<StoreUserMembershipEntity, Long> {
    Optional<StoreUserMembershipEntity> findByStoreIdAndUserId(Long storeId, Long userId);
    List<StoreUserMembershipEntity> findByUserIdOrderByIdAsc(Long userId);
    List<StoreUserMembershipEntity> findByStoreIdOrderByIdAsc(Long storeId);
}
