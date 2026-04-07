package com.paf.Api.Dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UserResponse {
    private Long idUser;
    private String nome;
    private String email;
    private String senha;
    private String role;
    private Long storeId;
    private String storeName;
    private String sessionToken;
    private String sessionExpiresAt;
}
