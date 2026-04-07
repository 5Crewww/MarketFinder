package com.paf.Infrastructure.Entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "produtos",
        indexes = {
                @Index(name = "idx_produtos_nome_normalizado", columnList = "normalized_nome"),
                @Index(name = "idx_produtos_categoria_nome", columnList = "categoria,normalized_nome")
        }
)
@Getter
@Setter
public class ProductEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_prod")
    private Long id;

    @Column(name = "nome", nullable = false)
    private String nome;

    @Column(name = "normalized_nome", nullable = false)
    private String normalizedNome;

    @Column(name = "descricao")
    private String descricao;

    @Column(name = "categoria")
    private String categoria;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @OneToMany(mappedBy = "product")
    private List<InventoryEntity> inventoryItems = new ArrayList<>();
}
