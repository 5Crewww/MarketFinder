package com.paf.Api.Dto;


import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.antlr.v4.runtime.misc.NotNull;

@Getter
@Setter
@NoArgsConstructor
public class CorredorRequest {

    // id é opcional (para updates)
    private Long id;

    @SuppressWarnings("deprecation")
    @NotNull
    private String nome;

    // opcional: id da loja (quando o frontend fornece explicitamente)
    private Long storeId;

}
