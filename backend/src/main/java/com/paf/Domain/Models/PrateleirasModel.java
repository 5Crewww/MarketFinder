package com.paf.Domain.Models;


import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter
@Getter
@NoArgsConstructor

public class PrateleirasModel {

    private Long id;
    private String name;
    private Long corredorId;
    private Double posX = 50.0;
    private Double posY = 50.0;
    private Double width = 10.0;
    private Double height = 5.0;

}
