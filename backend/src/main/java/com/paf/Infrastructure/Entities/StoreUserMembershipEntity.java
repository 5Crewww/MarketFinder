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
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
        name = "store_user_memberships",
        uniqueConstraints = @UniqueConstraint(name = "uk_store_user_membership", columnNames = {"store_id", "user_id"}),
        indexes = {
                @Index(name = "idx_membership_store", columnList = "store_id"),
                @Index(name = "idx_membership_user", columnList = "user_id")
        }
)
@Getter
@Setter
public class StoreUserMembershipEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_membership")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "store_id", nullable = false)
    private StoreEntity store;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(name = "membership_role", nullable = false, length = 40)
    private String membershipRole;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;
}
