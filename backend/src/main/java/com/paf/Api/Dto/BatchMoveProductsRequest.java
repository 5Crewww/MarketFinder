package com.paf.Api.Dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class BatchMoveProductsRequest {
    @NotNull(message = "A loja é obrigatória.")
    private Long storeId;

    @NotNull(message = "A prateleira de destino é obrigatória.")
    private Long targetShelfId;

    @Valid
    @NotEmpty(message = "Selecione pelo menos um produto.")
    private List<BatchMoveProductsItemRequest> items;
}
