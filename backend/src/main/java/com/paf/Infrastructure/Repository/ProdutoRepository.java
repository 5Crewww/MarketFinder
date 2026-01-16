package com.paf.Infrastructure.Repository;

import com.paf.Infrastructure.Entities.ProductEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProdutoRepository extends JpaRepository<ProductEntity, Long> {
    Optional<ProductEntity> findByNomeContainingIgnoreCase(String nome);
}
