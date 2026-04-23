package com.paf.Api.Dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class StoreRequest {
    @Size(max = 160, message = "Nome da loja demasiado longo.")
    private String name;

    @Size(max = 255, message = "Localizacao demasiado longa.")
    private String location;

    @Size(max = 1000, message = "Descricao demasiado longa.")
    private String description;

    @Size(max = 2_000_000, message = "Mapa demasiado grande.")
    private String layoutImageUrl;
    private Long version;
}
