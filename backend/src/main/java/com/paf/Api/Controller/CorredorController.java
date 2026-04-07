package com.paf.Api.Controller;

import com.paf.Api.Dto.CorredorRequest;
import com.paf.Api.Dto.CorredorResponde;
import com.paf.Domain.Services.CorredorService;
import com.paf.Domain.Services.StoreAccessService;
import com.paf.Infrastructure.Entities.CorredorEntity;
import com.paf.Util.InputSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.http.ResponseEntity.*;

@RestController
@RequestMapping("/corredores")
public class CorredorController {

    private final CorredorService corredorService;
    private final StoreAccessService storeAccessService;

    @Autowired
    public CorredorController(CorredorService corredorService, StoreAccessService storeAccessService) {
        this.corredorService = corredorService;
        this.storeAccessService = storeAccessService;
    }

    @GetMapping
    public ResponseEntity<List<CorredorResponde>> getCorredores(
            @RequestParam Long storeId,
            @RequestParam(required = false) String nome
    ) {
        List<CorredorEntity> entities = corredorService.getCorredores(storeId, nome);
        List<CorredorResponde> responseList = entities.stream().map(this::toResponse).toList();
        return ok(responseList);
    }

    @PostMapping
    public ResponseEntity<CorredorResponde> createCorredor(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @Valid @RequestBody CorredorRequest request
    ) {
        storeAccessService.requireStoreAccess(authorizationHeader, request.getStoreId());

        CorredorEntity saved = corredorService.createCorredor(sanitizeText(request.getNome()), request.getStoreId());
        if (saved == null) {
            return notFound().build();
        }

        ResponseEntity<CorredorResponde> body = status(HttpStatus.CREATED).body(toResponse(saved));
        return body;
    }

    @PutMapping("/{id}")
    public ResponseEntity<CorredorResponde> updateCorredor(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable Long id,
            @Valid @RequestBody CorredorRequest request
    ) {
        storeAccessService.requireStoreAccess(authorizationHeader, request.getStoreId());

        CorredorEntity updated = corredorService.updateCorredor(
                id,
                sanitizeText(request.getNome()),
                request.getStoreId(),
                request.getVersion()
        );
        if (updated == null) {
            return notFound().build();
        }

        return ok(toResponse(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCorredor(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable Long id,
            @RequestParam Long storeId
    ) {
        storeAccessService.requireStoreAccess(authorizationHeader, storeId);
        boolean deleted = corredorService.deleteCorredor(id, storeId);
        if (!deleted) {
            return notFound().build();
        }
        return noContent().build();
    }

    @GetMapping("/store/{storeId}")
    public ResponseEntity<List<CorredorResponde>> getByStore(@PathVariable Long storeId) {
        List<CorredorEntity> list = corredorService.getCorredores(storeId, null);
        List<CorredorResponde> resp = list.stream().map(this::toResponse).toList();
        return ok(resp);
    }

    private CorredorResponde toResponse(CorredorEntity entity) {
        CorredorResponde response = new CorredorResponde();
        response.setId(entity.getId());
        response.setName(sanitizeText(entity.getNome()));
        response.setStoreId(entity.getStore().getId());
        response.setVersion(entity.getVersion());
        return response;
    }

    private String sanitizeText(String value) {
        return InputSanitizer.sanitizeText(value, 120);
    }
}
