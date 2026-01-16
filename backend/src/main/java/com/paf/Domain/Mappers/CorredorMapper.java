package com.paf.Domain.Mappers;

import com.paf.Domain.Models.CorredorModel;
import com.paf.Infrastructure.Entities.CorredorEntity;


public interface CorredorMapper {

    public static CorredorEntity toEntity(CorredorModel modelc) {
        if (modelc == null) return null;
        CorredorEntity ce = new CorredorEntity();
        if (modelc.getId() != null) {
            ce.setId(modelc.getId());
        }
        ce.setNome(modelc.getName());
        // map storeId -> idLoja
        if (modelc.getStoreId() != null) {
            ce.setIdLoja(modelc.getStoreId());
        }
        return ce;
    }

    static CorredorModel toModel(CorredorEntity corredorEntity) {
        if (corredorEntity == null) return null;
        CorredorModel cm = new CorredorModel();
        cm.setId(corredorEntity.getId());
        cm.setName(corredorEntity.getNome());
        // map idLoja -> storeId
        cm.setStoreId(corredorEntity.getIdLoja());
        return cm;
    }

    static void updateEntityFromModel(CorredorEntity entity, CorredorModel corredorModel) {
        if (entity == null || corredorModel == null) return;
        entity.setNome(corredorModel.getName());
        if (corredorModel.getStoreId() != null) {
            entity.setIdLoja(corredorModel.getStoreId());
        }
    }
}
