package com.paf.Api.Dto;

import com.paf.Domain.Models.CorredorModel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class CorredorResponde {

    private Long id;
    private String name;
    private Long storeId;

    // helper para criar response a partir do model
    public static CorredorResponde fromModel(CorredorModel m) {
        if (m == null) return null;
        CorredorResponde r = new CorredorResponde();
        r.setId(m.getId());
        r.setName(m.getName());
        r.setStoreId(m.getStoreId());
        return r;
    }
}
