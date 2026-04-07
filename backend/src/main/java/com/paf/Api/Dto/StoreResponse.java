package com.paf.Api.Dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class StoreResponse {
    private Long id;
    private String name;
    private String layoutImageUrl;
    private boolean layoutConfigured;
    private Long ownerUserId;
    private Long version;
    private Integer memberCount;
}
