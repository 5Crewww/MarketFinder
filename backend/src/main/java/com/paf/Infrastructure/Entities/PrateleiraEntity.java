package com.paf.Infrastructure.Entities;

import jakarta.persistence.Entity;
import jakarta.persistence.*;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table (name = "prateleiras")
@Getter
@Setter
public class PrateleiraEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_prateleira")
    private Long id;

    @Column(name = "nome")
    private String nome;

    @Column(name = "id_corredor")
    private Long idCorredor;

    @Column(name = "posx")
    private Double posX;

    @Column(name = "posy")
    private Double posY;

    @Column(name = "width")
    private Double width;

    @Column(name = "height")
    private Double height;
}
