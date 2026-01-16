package com.paf.Api.Dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.antlr.v4.runtime.misc.NotNull;

@Getter
@Setter
@NoArgsConstructor
public class ProdutosRequest {

    @SuppressWarnings("deprecation")
    @NotNull
    private Long id;
    @SuppressWarnings("deprecation")
    @NotNull
    private String nome;
    @SuppressWarnings("deprecation")
    @NotNull
    private String descricao;
    @SuppressWarnings("deprecation")
    @NotNull
    private double preco;

    private Long idPrateleira;

    private Long idCorredor;


}
