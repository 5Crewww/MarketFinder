package com.paf.Domain.Models;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ProdutoModel {

private Long id;
private String nome;
private String descricao;
private double preco;
private Long idCorredor;
private Long idPrateleira;
}
