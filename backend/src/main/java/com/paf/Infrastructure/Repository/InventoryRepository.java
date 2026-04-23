package com.paf.Infrastructure.Repository;

import com.paf.Infrastructure.Entities.InventoryEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InventoryRepository extends JpaRepository<InventoryEntity, Long>, JpaSpecificationExecutor<InventoryEntity> {

    @EntityGraph(attributePaths = {"product", "shelf", "shelf.corredor", "store"})
    @Query(
            value = """
                    select inventory
                    from InventoryEntity inventory
                    join inventory.product product
                    where inventory.store.id = :storeId
                      and (:normalizedNome is null or product.normalizedNome like concat('%', :normalizedNome, '%'))
                      and (:categoria is null or lower(product.categoria) = lower(:categoria))
                      and (:precoMinCents is null or inventory.priceCents >= :precoMinCents)
                      and (:precoMaxCents is null or inventory.priceCents <= :precoMaxCents)
                      and (
                           :inStock is null
                           or (:inStock = true and inventory.stockQty > 0)
                           or (:inStock = false and inventory.stockQty <= 0)
                      )
                    """,
            countQuery = """
                    select count(inventory)
                    from InventoryEntity inventory
                    join inventory.product product
                    where inventory.store.id = :storeId
                      and (:normalizedNome is null or product.normalizedNome like concat('%', :normalizedNome, '%'))
                      and (:categoria is null or lower(product.categoria) = lower(:categoria))
                      and (:precoMinCents is null or inventory.priceCents >= :precoMinCents)
                      and (:precoMaxCents is null or inventory.priceCents <= :precoMaxCents)
                      and (
                           :inStock is null
                           or (:inStock = true and inventory.stockQty > 0)
                           or (:inStock = false and inventory.stockQty <= 0)
                      )
                    """
    )
    Page<InventoryEntity> searchInventory(
            @Param("storeId") Long storeId,
            @Param("normalizedNome") String normalizedNome,
            @Param("categoria") String categoria,
            @Param("precoMinCents") Long precoMinCents,
            @Param("precoMaxCents") Long precoMaxCents,
            @Param("inStock") Boolean inStock,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"product", "shelf", "shelf.corredor", "store"})
    Optional<InventoryEntity> findByIdAndStoreId(Long id, Long storeId);

    @EntityGraph(attributePaths = {"product", "shelf", "shelf.corredor", "store"})
    Optional<InventoryEntity> findByStoreIdAndProductId(Long storeId, Long productId);

    @EntityGraph(attributePaths = {"product", "shelf", "shelf.corredor", "store"})
    @Query("""
            select inventory
            from InventoryEntity inventory
            join inventory.product product
            where inventory.store.id = :storeId
              and product.normalizedNome = :normalizedNome
              and (
                  (:categoria is null and product.categoria is null)
                  or lower(product.categoria) = lower(:categoria)
              )
              and (
                  (:descricao is null and product.descricao is null)
                  or product.descricao = :descricao
              )
              and (
                  (:marca is null and product.marca is null)
                  or lower(product.marca) = lower(:marca)
              )
            order by inventory.id asc
            """)
    List<InventoryEntity> findActiveByStoreIdAndProductMetadata(
            @Param("storeId") Long storeId,
            @Param("normalizedNome") String normalizedNome,
            @Param("categoria") String categoria,
            @Param("descricao") String descricao,
            @Param("marca") String marca
    );

    @EntityGraph(attributePaths = {"product", "shelf", "shelf.corredor", "store"})
    List<InventoryEntity> findByStoreIdOrderByUpdatedAtDesc(Long storeId);

    @EntityGraph(attributePaths = {"product", "shelf", "shelf.corredor", "store"})
    List<InventoryEntity> findByIdInAndStoreId(List<Long> ids, Long storeId);

    List<InventoryEntity> findByShelfId(Long shelfId);

    long countByProductId(Long productId);

    @Query("""
            select distinct product.categoria
            from InventoryEntity inventory
            join inventory.product product
            where inventory.store.id = :storeId
              and product.categoria is not null
              and product.categoria <> ''
            order by product.categoria asc
            """)
    List<String> findDistinctCategoriesByStoreId(@Param("storeId") Long storeId);
}
