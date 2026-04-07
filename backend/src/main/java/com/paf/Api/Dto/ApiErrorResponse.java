package com.paf.Api.Dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class ApiErrorResponse {
    private String message;
    private List<String> details;
    private Instant timestamp = Instant.now();
}
