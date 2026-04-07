package com.paf.Api.Dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
public class ProdutosRequest {
    private Long id;
    private Long productId;

    @Size(max = 160, message = "Nome do produto demasiado longo.")
    private String nome;

    @Size(max = 1000, message = "Descrição demasiado longa.")
    private String descricao;

    @Size(max = 120, message = "Categoria demasiado longa.")
    private String categoria;

    @DecimalMin(value = "0.0", inclusive = true, message = "Preço inválido.")
    private BigDecimal preco;

    @PositiveOrZero(message = "Stock inválido.")
    private Integer stock;
    private Long idPrateleira;

    @NotNull(message = "A loja é obrigatória.")
    private Long storeId;
    private Long version;
}
