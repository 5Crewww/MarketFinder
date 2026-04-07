package com.paf.Infrastructure.Entities;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "prateleiras")
@Getter
@Setter
public class PrateleiraEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_prateleira")
    private Long id;

    @Column(name = "nome", nullable = false)
    private String nome;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_corredor", nullable = false)
    private CorredorEntity corredor;

    @Column(name = "posx")
    private Double posX;

    @Column(name = "posy")
    private Double posY;

    @Column(name = "width")
    private Double width;

    @Column(name = "height")
    private Double height;

    @OneToMany(mappedBy = "shelf", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InventoryEntity> inventoryItems = new ArrayList<>();
}
