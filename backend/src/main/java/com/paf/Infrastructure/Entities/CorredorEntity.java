package com.paf.Infrastructure.Entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "corredores")
@Getter
@Setter

public class CorredorEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_corredor")
    private Long id;

    @Column(name = "nome")
    private String nome;

    @Column(name = "id_loja")
    private Long idLoja;

}
