package com.paf.Api.Dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UserRequest {
    private Long idUser;

    @Size(max = 120, message = "Nome demasiado longo.")
    private String nome;

    @Email(message = "Email inválido.")
    @Size(max = 180, message = "Email demasiado longo.")
    private String email;

    @Size(min = 6, max = 120, message = "Senha inválida.")
    private String senha;

    @Size(max = 40, message = "Role inválido.")
    private String role;

    private Long storeId;

    @Size(max = 160, message = "Nome da loja demasiado longo.")
    private String storeName;
}
