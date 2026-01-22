package com.paf.Domain.Services;

import com.paf.Domain.Mappers.CorredorMapper;
import com.paf.Domain.Models.CorredorModel;
import com.paf.Infrastructure.Entities.CorredorEntity;
import com.paf.Infrastructure.Repository.CorredorRepository;

import java.util.Optional;

public class CorredorService {

    private CorredorRepository corredorRepository;
    private Long currentUserId;

    public void setCorredorRepository(CorredorRepository corredorRepository) {
        this.corredorRepository = corredorRepository;
    }


    public void setCurrentUserId(Long currentUserId) {
        this.currentUserId = currentUserId;
    }


    private Long getCurrentUserId() {
        return this.currentUserId;
    }

    public String CreateCorredor(CorredorModel corredorModel) {

        if (corredorModel == null) {
            return "Invalid corredor";
        }

        Long userId = getCurrentUserId();
        if (userId != null) {
            corredorModel.setStoreId(userId);
        }

        CorredorEntity corredorEntity = CorredorMapper.toEntity(corredorModel);

        CorredorEntity saved = corredorRepository.save(corredorEntity);

        corredorModel.setId(saved.getId());

        return "Shelf created with id: " + saved.getId();
    }

    public CorredorModel GetByName(String nome) {
        Optional<CorredorEntity> opt = corredorRepository.findByNome(nome);
        if (opt.isEmpty()) return null;
        return CorredorMapper.toModel(opt.get());
    }

    public boolean DeleteCorredor(Long id) {
        if (!corredorRepository.existsById(id)) return false;
        corredorRepository.deleteById(id);
        return true;
    }

    public CorredorModel UpdateCorredor(CorredorModel corredorModel) {
        if (corredorModel == null || corredorModel.getId() == null) return null;
        Optional<CorredorEntity> opt = corredorRepository.findById(corredorModel.getId());
        if (opt.isEmpty()) return null;
        CorredorEntity entity = opt.get();

        Long userId = getCurrentUserId();
        if (userId != null) {
            corredorModel.setStoreId(userId);
        }

        CorredorMapper.updateEntityFromModel(entity, corredorModel);

        CorredorEntity saved = corredorRepository.save(entity);
        return CorredorMapper.toModel(saved);
    }
}
