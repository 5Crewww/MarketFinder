package com.paf.Api.Dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PrateleiraRequest {
    private Long id;

    @Size(max = 120, message = "Nome da prateleira demasiado longo.")
    private String name;
    private Long corredorId;

    @NotNull(message = "A loja é obrigatória.")
    private Long storeId;

    @PositiveOrZero(message = "A posição X tem de ser positiva.")
    private Double posX;

    @PositiveOrZero(message = "A posição Y tem de ser positiva.")
    private Double posY;

    @PositiveOrZero(message = "A largura tem de ser positiva.")
    private Double width;

    @PositiveOrZero(message = "A altura tem de ser positiva.")
    private Double height;
    private Long version;

}
