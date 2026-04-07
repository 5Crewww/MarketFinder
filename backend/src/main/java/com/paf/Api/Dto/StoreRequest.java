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

    @Size(max = 2_000_000, message = "Mapa demasiado grande.")
    private String layoutImageUrl;
    private Long version;
}
