package com.paf.Domain.Services;

import com.paf.Infrastructure.Entities.CorredorEntity;
import com.paf.Infrastructure.Entities.StoreEntity;
import com.paf.Infrastructure.Repository.CorredorRepository;
import com.paf.Infrastructure.Repository.ProdutoRepository;
import com.paf.Infrastructure.Repository.StoreRepository;
import com.paf.Util.InputSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

@Service
public class CorredorService {

    private final CorredorRepository corredorRepository;
    private final StoreRepository storeRepository;
    private final ProdutoRepository produtoRepository;

    @Autowired
    public CorredorService(
            CorredorRepository corredorRepository,
            StoreRepository storeRepository,
            ProdutoRepository produtoRepository
    ) {
        this.corredorRepository = corredorRepository;
        this.storeRepository = storeRepository;
        this.produtoRepository = produtoRepository;
    }

    public List<CorredorEntity> getCorredores(Long storeId, String nome) {
        requirePositiveId(storeId, "Loja inválida.");

        if (nome == null || nome.isBlank()) {
            return corredorRepository.findByStoreIdOrderByNomeAsc(storeId);
        }

        String nomeLimpo = InputSanitizer.sanitizeText(nome, 120);
        if (nomeLimpo == null) {
            return Collections.emptyList();
        }

        return corredorRepository.findByStoreIdAndNomeContainingIgnoreCaseOrderByNomeAsc(storeId, nomeLimpo);
    }

    public CorredorEntity createCorredor(String nome, Long storeId) {
        requirePositiveId(storeId, "Loja inválida.");

        StoreEntity store = storeRepository.findById(storeId).orElse(null);
        if (store == null) {
            return null;
        }

        String nomeLimpo = InputSanitizer.sanitizeText(nome, 120);
        if (nomeLimpo == null) {
            throw new IllegalArgumentException("Nome do corredor é obrigatório.");
        }

        CorredorEntity entity = new CorredorEntity();
        entity.setNome(nomeLimpo);
        entity.setStore(store);
        return corredorRepository.save(entity);
    }

    @Transactional
    public CorredorEntity updateCorredor(Long id, String nome, Long storeId, Long version) {
        requirePositiveId(id, "Corredor inválido.");
        requirePositiveId(storeId, "Loja inválida.");

        CorredorEntity entity = corredorRepository.findByIdAndStoreId(id, storeId).orElse(null);
        if (entity == null) {
            return null;
        }

        if (version != null && entity.getVersion() != null && !version.equals(entity.getVersion())) {
            throw new OptimisticLockingFailureException("Corredor desatualizado.");
        }

        if (nome != null) {
            String nomeLimpo = InputSanitizer.sanitizeText(nome, 120);
            if (nomeLimpo == null) {
                throw new IllegalArgumentException("Nome do corredor é obrigatório.");
            }
            entity.setNome(nomeLimpo);
        }

        return corredorRepository.save(entity);
    }

    @Transactional
    public boolean deleteCorredor(Long id, Long storeId) {
        requirePositiveId(id, "Corredor inválido.");
        requirePositiveId(storeId, "Loja inválida.");

        CorredorEntity entity = corredorRepository.findByIdAndStoreId(id, storeId).orElse(null);
        if (entity == null) {
            return false;
        }

        corredorRepository.delete(entity);
        produtoRepository.deleteOrphanProducts();
        return true;
    }

    private void requirePositiveId(Long value, String message) {
        if (value == null || value <= 0) {
            throw new IllegalArgumentException(message);
        }
    }
}
