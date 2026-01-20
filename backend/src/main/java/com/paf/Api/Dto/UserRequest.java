package com.paf.Api.Dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.antlr.v4.runtime.misc.NotNull;

@Getter
@Setter
@NoArgsConstructor

public class UserRequest {

    @SuppressWarnings("deprecation")
    @NotNull
    private Long idUser;
    @SuppressWarnings("deprecation")
    @NotNull
    private String nome;
    @SuppressWarnings("deprecation")
    @NotNull
    private String email;
    @SuppressWarnings("deprecation")
    @NotNull
    private String senha;
    @NotNull
    private String role;

}
