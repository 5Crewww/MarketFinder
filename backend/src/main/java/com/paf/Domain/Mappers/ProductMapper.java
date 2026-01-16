package com.paf.Domain.Mappers;

import com.paf.Domain.Models.ProdutoModel;
import com.paf.Infrastructure.Entities.ProductEntity;



public interface ProductMapper {

    public static ProductEntity toEntity(ProdutoModel model) {
        if (model == null) return null;
        ProductEntity pe = new ProductEntity();
        if (model.getId() != null) {
            pe.setId(model.getId());
        }
        pe.setNome(model.getNome());
        pe.setDescricao(model.getDescricao());
        pe.setPreco(model.getPreco());
        pe.setIdPrateleira(model.getIdPrateleira());
        pe.setIdCorredor(model.getIdCorredor());;
        return pe;
    }

    public static ProdutoModel toModel(ProductEntity entity) {
        if (entity == null) return null;
        ProdutoModel pm = new ProdutoModel();
        pm.setId(entity.getId());
        pm.setNome(entity.getNome());
        pm.setDescricao(entity.getDescricao());
        pm.setPreco(entity.getPreco());
        pm.setIdPrateleira(entity.getIdPrateleira());
        pm.setIdCorredor(entity.getIdCorredor());
        return pm;
    }

    public static void updateEntityFromModel(ProductEntity entity, ProdutoModel model) {
        if (entity == null || model == null) return;
        if (model.getId() != null) {
            entity.setId(model.getId());
        }
        entity.setNome(model.getNome());
        entity.setDescricao(model.getDescricao());
        entity.setPreco(model.getPreco());
        entity.setIdPrateleira(model.getIdPrateleira());
        entity.setIdCorredor(model.getIdCorredor());

    }
}
