package com.paf.Infrastructure.Entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table (name = "users")
@Getter
@Setter
public class UserEntity {

    @Id
    @Column (name = "id_user")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column (name = "Nome_user")
    private String nome;
    @Column (name = "email_user")
    private String email;
    @Column (name = "senha_user")
    private String senha;

}
