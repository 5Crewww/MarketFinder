package com.paf.Api.Dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.antlr.v4.runtime.misc.NotNull;

@Getter
@Setter
@NoArgsConstructor
public class PrateleiraRequest {
    private Long id;

    @SuppressWarnings("deprecation")
    @NotNull
    private String name;
    private Long corredorId;
    private Double posX;
    private Double posY;
    private Double width;
    private Double height;

}

