package com.paf.Api.Dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class BatchMoveProductsItemRequest {
    @NotNull(message = "O identificador do inventário é obrigatório.")
    private Long inventoryId;

    @NotNull(message = "A versão do item é obrigatória.")
    private Long version;
}
