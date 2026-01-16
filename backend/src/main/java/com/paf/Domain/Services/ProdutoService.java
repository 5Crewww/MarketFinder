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

    /**
     * MUDANÇA 1: createProdutoObject
     * Retorna o OBJETO completo (com ID) em vez de String.
     * Isso permite ao Controller devolver JSON válido ao React.
     */
    public ProdutoModel createProdutoObject(ProdutoModel produtoModel) {
        if (produtoModel == null) {
            return null;
        }
        ProductEntity prod = ProductMapper.toEntity(produtoModel);

        // Salva e gera o ID automaticamente
        ProductEntity saved = produtoRepository.save(prod);

        // Retorna o modelo convertido de volta (agora com ID)
        return ProductMapper.toModel(saved);
    }

    /**
     * MUDANÇA 2: getAll()
     * Necessário para carregar a tabela inicial quando não há pesquisa.
     */
    public List<ProdutoModel> getAll() {
        List<ProductEntity> entities = produtoRepository.findAll();
        if (entities.isEmpty()) return Collections.emptyList();

        return entities.stream()
                .map(ProductMapper::toModel)
                .collect(Collectors.toList());
    }

    /**
     * MUDANÇA 3: GetByName (Ajuste)
     * Mantive a tua lógica, mas é preferível retornar List no futuro.
     * Por agora, devolve um único modelo para não partir o código antigo.
     */
    public ProdutoModel GetByName(String nome) {
        // Nota: Se houver 2 produtos com nomes parecidos, o Optional pode dar erro.
        // O ideal seria o Repository retornar List<ProductEntity>
        Optional<ProductEntity> pbn = produtoRepository.findByNomeContainingIgnoreCase(nome)
                .stream().findFirst(); // Pega o primeiro para evitar erros se vierem muitos

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