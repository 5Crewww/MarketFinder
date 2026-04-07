package com.paf.Infrastructure.Entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table (name = "users")
@Getter
@Setter
public class UserEntity {

    @Id
    @Column (name = "id_user")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column (name = "nome_user")
    private String nome;
    @Column (name = "email_user")
    private String email;
    @Column (name = "senha_user")
    private String senha;
    @Column (name = "role")
    private String role;

    @OneToMany(mappedBy = "owner", fetch = FetchType.LAZY)
    private List<StoreEntity> ownedStores = new ArrayList<>();

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StoreUserMembershipEntity> memberships = new ArrayList<>();

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private List<UserSessionEntity> sessions = new ArrayList<>();

}
