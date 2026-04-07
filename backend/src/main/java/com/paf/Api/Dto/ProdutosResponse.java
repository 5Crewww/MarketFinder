package com.paf.Api.Dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
public class ProdutosResponse {
    private Long id;
    private Long productId;
    private String nome;
    private String descricao;
    private String categoria;
    private BigDecimal preco;
    private Integer stock;
    private Long storeId;
    private String storeName;
    private Long idPrateleira;
    private String nomePrateleira;
    private Double posXPrateleira;
    private Double posYPrateleira;
    private Long idCorredor;
    private String nomeCorredor;
    private Long version;
}
