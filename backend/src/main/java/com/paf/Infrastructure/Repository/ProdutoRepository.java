package com.paf.Infrastructure.Repository;

import com.paf.Infrastructure.Entities.ProductEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProdutoRepository extends JpaRepository<ProductEntity, Long> {
    List<ProductEntity> findByNomeContainingIgnoreCase(String nome);
    List<ProductEntity> findByNormalizedNomeContaining(String normalizedNome);
    List<ProductEntity> findByNormalizedNomeAndCategoriaAndDescricao(String normalizedNome, String categoria, String descricao);

    @Modifying
    @Query(
            value = """
                    delete from produtos
                    where not exists (
                        select 1
                        from inventory
                        where inventory.product_id = produtos.id_prod
                    )
                    """,
            nativeQuery = true
    )
    int deleteOrphanProducts();
}
