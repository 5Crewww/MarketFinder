package com.paf.Domain.Models;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor

public class UserModel {

    private Long idUser;
    private String nome;
    private String email;
    private String senha;
    private String role;


}
