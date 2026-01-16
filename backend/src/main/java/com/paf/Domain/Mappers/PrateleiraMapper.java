package com.paf.Domain.Mappers;

import com.paf.Domain.Models.PrateleirasModel;
import com.paf.Infrastructure.Entities.PrateleiraEntity;

public interface PrateleiraMapper {

    // 1. Converter do Modelo (Lógica) para a Entidade (Banco de Dados)
    static PrateleiraEntity toEntity(PrateleirasModel model) {
        if (model == null) return null;
        PrateleiraEntity e = new PrateleiraEntity();

        if (model.getId() != null) {
            e.setId(model.getId());
        }
        e.setNome(model.getName());
        e.setIdCorredor(model.getCorredorId());

        // --- NOVOS CAMPOS ---
        e.setPosX(model.getPosX());
        e.setPosY(model.getPosY());
        e.setWidth(model.getWidth());
        e.setHeight(model.getHeight());

        return e;
    }

    // 2. Converter da Entidade (Banco de Dados) para o Modelo (Lógica)
    static PrateleirasModel toModel(PrateleiraEntity entity) {
        if (entity == null) return null;
        PrateleirasModel m = new PrateleirasModel();

        m.setId(entity.getId());
        m.setName(entity.getNome());
        m.setCorredorId(entity.getIdCorredor());

        // --- NOVOS CAMPOS ---
        m.setPosX(entity.getPosX());
        m.setPosY(entity.getPosY());
        m.setWidth(entity.getWidth());
        m.setHeight(entity.getHeight());

        return m;
    }

    // 3. Atualizar uma Entidade existente com dados novos do Modelo
    static void updateEntityFromModel(PrateleiraEntity entity, PrateleirasModel model) {
        if (entity == null || model == null) return;

        if (model.getId() != null) {
            entity.setId(model.getId());
        }
        // Atualiza Nome e Corredor
        if (model.getName() != null) entity.setNome(model.getName());
        if (model.getCorredorId() != null) entity.setIdCorredor(model.getCorredorId());

        // --- NOVOS CAMPOS (Atualiza só se não forem null) ---
        if (model.getPosX() != null) entity.setPosX(model.getPosX());
        if (model.getPosY() != null) entity.setPosY(model.getPosY());
        if (model.getWidth() != null) entity.setWidth(model.getWidth());
        if (model.getHeight() != null) entity.setHeight(model.getHeight());
    }
}