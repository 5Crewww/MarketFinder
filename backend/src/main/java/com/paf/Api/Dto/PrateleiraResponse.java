package com.paf.Api.Dto;

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
    private Long storeId;
    private String corredorName;
    private Double posX;
    private Double posY;
    private Double width;
    private Double height;
    private Long version;
    private boolean pinned;
}
