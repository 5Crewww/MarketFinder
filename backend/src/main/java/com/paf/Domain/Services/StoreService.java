package com.paf.Domain.Services;

import com.paf.Infrastructure.Entities.StoreEntity;
import com.paf.Infrastructure.Repository.StoreRepository;
import com.paf.Util.InputSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class StoreService {

    private final StoreRepository storeRepository;

    @Autowired
    public StoreService(StoreRepository storeRepository) {
        this.storeRepository = storeRepository;
    }

    public List<StoreEntity> getAll() {
        return storeRepository.findAllByOrderByNameAsc();
    }

    public StoreEntity getById(Long id) {
        return storeRepository.findById(id).orElse(null);
    }

    @Transactional
    public StoreEntity updateLayout(Long storeId, String layoutImageUrl, Long version) {
        StoreEntity store = storeRepository.findById(storeId).orElse(null);
        if (store == null) {
            return null;
        }
        if (version != null && store.getVersion() != null && !version.equals(store.getVersion())) {
            throw new OptimisticLockingFailureException("Mapa da loja desatualizado.");
        }
        store.setLayoutImageUrl(InputSanitizer.sanitizeLayoutImage(layoutImageUrl));
        return storeRepository.save(store);
    }
}
