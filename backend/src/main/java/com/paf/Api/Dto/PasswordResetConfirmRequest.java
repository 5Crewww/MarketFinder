package com.paf.Api.Dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PasswordResetConfirmRequest {

    @NotBlank(message = "Token é obrigatório.")
    @Size(max = 255, message = "Token inválido.")
    private String token;

    @NotBlank(message = "Nova senha é obrigatória.")
    @Size(min = 6, max = 120, message = "Nova senha inválida.")
    private String novaSenha;
}
