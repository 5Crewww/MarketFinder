package com.paf.Domain.Services;

import com.paf.Infrastructure.Entities.StoreUserMembershipEntity;
import com.paf.Infrastructure.Entities.StoreEntity;
import com.paf.Infrastructure.Entities.UserEntity;
import com.paf.Infrastructure.Entities.UserSessionEntity;
import com.paf.Infrastructure.Repository.StoreRepository;
import com.paf.Infrastructure.Repository.StoreUserMembershipRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StoreAccessService {

    private final SessionService sessionService;
    private final StoreUserMembershipRepository membershipRepository;
    private final StoreRepository storeRepository;

    @Autowired
    public StoreAccessService(
            SessionService sessionService,
            StoreUserMembershipRepository membershipRepository,
            StoreRepository storeRepository
    ) {
        this.sessionService = sessionService;
        this.membershipRepository = membershipRepository;
        this.storeRepository = storeRepository;
    }

    public UserSessionEntity requireSession(String sessionToken) {
        return sessionService.requireActiveSession(sessionToken);
    }

    public UserEntity requireStoreAccess(String sessionToken, Long storeId) {
        UserSessionEntity session = sessionService.requireActiveSession(sessionToken);
        UserEntity user = session.getUser();

        if ("admin".equalsIgnoreCase(user.getRole())) {
            return user;
        }

        if (storeId == null) {
            throw new SecurityException("Loja inválida.");
        }

        StoreUserMembershipEntity membership = membershipRepository.findByStoreIdAndUserId(storeId, user.getId()).orElse(null);
        if (membership != null) {
            return user;
        }

        boolean isOwner = storeRepository.findById(storeId)
                .map(store -> store.getOwner() != null && store.getOwner().getId().equals(user.getId()))
                .orElse(false);

        if (isOwner) {
            return user;
        }

        throw new SecurityException("Sessão sem acesso à loja solicitada.");
    }

    public Long requireManagedStoreId(String sessionToken) {
        UserSessionEntity session = sessionService.requireActiveSession(sessionToken);
        UserEntity user = session.getUser();

        if (user == null || !"lojista".equalsIgnoreCase(user.getRole())) {
            throw new SecurityException("Apenas lojistas podem importar produtos via CSV.");
        }

        List<StoreEntity> ownedStores = storeRepository.findByOwnerIdOrderByIdAsc(user.getId());
        if (!ownedStores.isEmpty()) {
            return ownedStores.get(0).getId();
        }

        List<StoreUserMembershipEntity> memberships = membershipRepository.findByUserIdOrderByIdAsc(user.getId());
        if (!memberships.isEmpty() && memberships.get(0).getStore() != null) {
            return memberships.get(0).getStore().getId();
        }

        throw new SecurityException("Sessão sem loja associada.");
    }
}
