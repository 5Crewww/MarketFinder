package com.paf.Api.Dto;


import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class CorredorRequest {

    private Long id;

    @Size(max = 120, message = "Nome do corredor demasiado longo.")
    private String nome;

    @NotNull(message = "A loja é obrigatória.")
    private Long storeId;
    private Long version;

}
