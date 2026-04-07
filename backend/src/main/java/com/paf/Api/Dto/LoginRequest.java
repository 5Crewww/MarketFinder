package com.paf.Api.Dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class LoginRequest {
    @JsonAlias({"email", "identificador", "username"})
    @NotBlank(message = "Email ou nome de utilizador é obrigatório.")
    @Size(max = 180, message = "Identificador demasiado longo.")
    private String nome;

    @NotBlank(message = "Senha é obrigatória.")
    @Size(min = 6, max = 120, message = "Senha inválida.")
    private String senha;
}
