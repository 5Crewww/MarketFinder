package com.paf.Api.Dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PasswordResetRequest {

    @Email(message = "Email inválido.")
    @NotBlank(message = "Email é obrigatório.")
    @Size(max = 180, message = "Email demasiado longo.")
    private String email;
}
