package com.paf.Infrastructure.Entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.time.Instant;

@Entity
@Table(
        name = "inventory",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_inventory_store_product", columnNames = {"store_id", "product_id"})
        },
        indexes = {
                @Index(name = "idx_inventory_store", columnList = "store_id"),
                @Index(name = "idx_inventory_store_shelf", columnList = "store_id,shelf_id"),
                @Index(name = "idx_inventory_price", columnList = "price_cents")
        }
)
@SQLDelete(sql = "UPDATE inventory SET is_deleted = true WHERE id_inventory=? AND version=?")
@SQLRestriction("is_deleted = false")
@Getter
@Setter
@NoArgsConstructor
public class InventoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_inventory")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "store_id", nullable = false)
    private StoreEntity store;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private ProductEntity product;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shelf_id", nullable = false)
    private PrateleiraEntity shelf;

    @Column(name = "price_cents", nullable = false)
    private Long priceCents;

    @Column(name = "stock_qty", nullable = false)
    private Integer stockQty;

    @Version
    @Column(name = "version")
    private Long version;

    @Column(name = "is_deleted", nullable = false)
    private boolean deleted = false;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    public void touchUpdatedAt() {
        updatedAt = Instant.now();
    }
}
