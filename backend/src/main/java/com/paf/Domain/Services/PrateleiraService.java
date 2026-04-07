package com.paf.Domain.Services;

import com.paf.Infrastructure.Entities.CorredorEntity;
import com.paf.Infrastructure.Entities.PrateleiraEntity;
import com.paf.Infrastructure.Repository.CorredorRepository;
import com.paf.Infrastructure.Repository.PrateleiraRepository;
import com.paf.Infrastructure.Repository.ProdutoRepository;
import com.paf.Util.InputSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

@Service
public class PrateleiraService {

    private final PrateleiraRepository repository;
    private final CorredorRepository corredorRepository;
    private final ProdutoRepository produtoRepository;

    @Autowired
    public PrateleiraService(
            PrateleiraRepository repository,
            CorredorRepository corredorRepository,
            ProdutoRepository produtoRepository
    ) {
        this.repository = repository;
        this.corredorRepository = corredorRepository;
        this.produtoRepository = produtoRepository;
    }

    public PrateleiraEntity createPrateleira(
            String name,
            Long corredorId,
            Long storeId,
            Double posX,
            Double posY,
            Double width,
            Double height
    ) {
        requirePositiveId(corredorId, "Corredor inválido.");
        requirePositiveId(storeId, "Loja inválida.");

        CorredorEntity corredor = corredorRepository.findByIdAndStoreId(corredorId, storeId).orElse(null);
        if (corredor == null) {
            return null;
        }

        String sanitizedName = InputSanitizer.sanitizeText(name, 120);
        if (sanitizedName == null) {
            throw new IllegalArgumentException("Nome da prateleira é obrigatório.");
        }

        PrateleiraEntity entity = new PrateleiraEntity();
        entity.setNome(sanitizedName);
        entity.setCorredor(corredor);
        entity.setPosX(posX);
        entity.setPosY(posY);
        entity.setWidth(width != null ? width : 10.0);
        entity.setHeight(height != null ? height : 5.0);
        return repository.save(entity);
    }

    public List<PrateleiraEntity> getAll(Long storeId) {
        requirePositiveId(storeId, "Loja inválida.");
        return repository.findByCorredorStoreIdOrderByNomeAsc(storeId);
    }

    public List<PrateleiraEntity> getByName(Long storeId, String name) {
        requirePositiveId(storeId, "Loja inválida.");

        String nomeLimpo = InputSanitizer.sanitizeText(name, 120);
        if (nomeLimpo == null) {
            return Collections.emptyList();
        }

        return repository.findByCorredorStoreIdAndNomeContainingIgnoreCaseOrderByNomeAsc(storeId, nomeLimpo);
    }

    public List<PrateleiraEntity> getByCorredor(Long storeId, Long corredorId) {
        requirePositiveId(storeId, "Loja inválida.");
        requirePositiveId(corredorId, "Corredor inválido.");
        return repository.findByCorredorIdAndCorredorStoreIdOrderByNomeAsc(corredorId, storeId);
    }

    @Transactional
    public boolean deletePrateleira(Long id, Long storeId) {
        requirePositiveId(id, "Prateleira inválida.");
        requirePositiveId(storeId, "Loja inválida.");

        PrateleiraEntity entity = repository.findByIdAndCorredorStoreId(id, storeId).orElse(null);
        if (entity == null) {
            return false;
        }

        repository.delete(entity);
        produtoRepository.deleteOrphanProducts();
        return true;
    }

    @Transactional
    public PrateleiraEntity updatePrateleira(
            Long id,
            Long storeId,
            String name,
            Long corredorId,
            Double posX,
            Double posY,
            Double width,
            Double height,
            Long version
    ) {
        requirePositiveId(id, "Prateleira inválida.");
        requirePositiveId(storeId, "Loja inválida.");

        PrateleiraEntity entity = repository.findByIdAndCorredorStoreId(id, storeId).orElse(null);
        if (entity == null) {
            return null;
        }

        if (version != null && entity.getVersion() != null && !version.equals(entity.getVersion())) {
            throw new OptimisticLockingFailureException("Prateleira desatualizada.");
        }

        if (name != null) {
            String sanitizedName = InputSanitizer.sanitizeText(name, 120);
            if (sanitizedName == null) {
                throw new IllegalArgumentException("Nome da prateleira é obrigatório.");
            }
            entity.setNome(sanitizedName);
        }

        if (corredorId != null && !corredorId.equals(entity.getCorredor().getId())) {
            requirePositiveId(corredorId, "Corredor inválido.");
            CorredorEntity corredor = corredorRepository.findByIdAndStoreId(corredorId, storeId).orElse(null);
            if (corredor == null) {
                return null;
            }
            entity.setCorredor(corredor);
        }

        if (posX != null) {
            entity.setPosX(posX);
        }
        if (posY != null) {
            entity.setPosY(posY);
        }
        if (width != null) {
            entity.setWidth(width);
        }
        if (height != null) {
            entity.setHeight(height);
        }

        return repository.save(entity);
    }

    private void requirePositiveId(Long value, String message) {
        if (value == null || value <= 0) {
            throw new IllegalArgumentException(message);
        }
    }
}
