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
    public StoreEntity updateDetails(Long storeId, String name, String location, String description, Long version) {
        StoreEntity store = storeRepository.findById(storeId).orElse(null);
        if (store == null) {
            return null;
        }
        if (version != null && store.getVersion() != null && !version.equals(store.getVersion())) {
            throw new OptimisticLockingFailureException("Dados da loja desatualizados.");
        }

        String sanitizedName = InputSanitizer.sanitizeText(name, 160);
        if (sanitizedName == null || sanitizedName.isBlank()) {
            throw new IllegalArgumentException("Nome da loja invalido.");
        }

        store.setName(sanitizedName);
        store.setLocation(InputSanitizer.sanitizeText(location, 255));
        store.setDescription(InputSanitizer.sanitizeText(description, 1000));
        return storeRepository.saveAndFlush(store);
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
        return storeRepository.saveAndFlush(store);
    }

    @Transactional
    public StoreEntity uploadLogo(Long storeId, byte[] logoData, String contentType) {
        StoreEntity store = storeRepository.findById(storeId).orElse(null);
        if (store == null) {
            return null;
        }
        store.setLogoData(logoData);
        store.setLogoContentType(contentType);
        return storeRepository.saveAndFlush(store);
    }
}
