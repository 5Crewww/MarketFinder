package com.paf.Infrastructure.Entities;

import jakarta.persistence.*; // Certifique-se de que está a usar jakarta.persistence
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "produtos") // O nome da tabela deve ser o mesmo da base de dados
@Getter
@Setter
public class ProductEntity {


    @Id // Marca como chave primária
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_prod")
    private Long id;
    @Column(name = "nome")
    private String nome;
    @Column(name = "descricao")
    private String descricao;
    @Column(name = "preco")
    private double preco;
    @Column(name = "id_prateleira")
    private Long idPrateleira;
    @Column(name = "id_corredor")
    private Long idCorredor;

}