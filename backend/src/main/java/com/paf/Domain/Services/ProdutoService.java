package com.paf.Domain.Services;

import com.paf.Domain.Mappers.ProductMapper;
import com.paf.Domain.Models.ProdutoModel;
import com.paf.Infrastructure.Entities.ProductEntity;
import com.paf.Infrastructure.Repository.ProdutoRepository;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@NoArgsConstructor
public class ProdutoService {

    @Autowired
    private ProdutoRepository produtoRepository;


    public ProdutoModel createProdutoObject(ProdutoModel produtoModel) {
        if (produtoModel == null) {
            return null;
        }
        ProductEntity prod = ProductMapper.toEntity(produtoModel);

        ProductEntity saved = produtoRepository.save(prod);

        return ProductMapper.toModel(saved);
    }

    public List<ProdutoModel> getAll() {
        List<ProductEntity> entities = produtoRepository.findAll();
        if (entities.isEmpty()) return Collections.emptyList();

        return entities.stream()
                .map(ProductMapper::toModel)
                .collect(Collectors.toList());
    }

    public ProdutoModel GetByName(String nome) {

        Optional<ProductEntity> pbn = produtoRepository.findByNomeContainingIgnoreCase(nome)
                .stream().findFirst();
        if (pbn.isEmpty()) return null;
        return ProductMapper.toModel(pbn.get());
    }

    public boolean deleteProduto(Long id) {
        if (!produtoRepository.existsById(id)) return false;
        produtoRepository.deleteById(id);
        return true;
    }

    public ProdutoModel UpdateProduto(ProdutoModel produtoModel) {
        if (produtoModel == null || produtoModel.getId() == null) return null;
        Optional<ProductEntity> opt = produtoRepository.findById(produtoModel.getId());
        if (opt.isEmpty()) return null;

        ProductEntity entity = opt.get();
        ProductMapper.updateEntityFromModel(entity, produtoModel);

        ProductEntity saved = produtoRepository.save(entity);
        return ProductMapper.toModel(saved);
    }
}