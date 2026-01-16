package com.paf.Api.Dto;

import com.paf.Domain.Models.PrateleirasModel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PrateleiraResponse {
    private Long id;
    private String name;
    private Long corredorId;
    private Double posX;
    private Double posY;
    private Double width;
    private Double height;

    public static PrateleiraResponse fromModel(PrateleirasModel m) {
        if (m == null) return null;
        PrateleiraResponse r = new PrateleiraResponse();
        r.setId(m.getId());
        r.setName(m.getName());
        r.setCorredorId(m.getCorredorId());
        r.setPosX(m.getPosX());
        r.setPosY(m.getPosY());
        r.setWidth(m.getWidth());
        r.setHeight(m.getHeight());


        return r;
    }
}

