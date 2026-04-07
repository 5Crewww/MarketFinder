package com.paf.Api.Controller;

import com.paf.Api.Dto.CorredorRequest;
import com.paf.Api.Dto.CorredorResponde;
import com.paf.Domain.Services.CorredorService;
import com.paf.Domain.Services.StoreAccessService;
import com.paf.Infrastructure.Entities.CorredorEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
        return ResponseEntity.ok(responseList);
    }

    @PostMapping
    public ResponseEntity<CorredorResponde> createCorredor(
            @RequestHeader(name = "X-Session-Token", required = false) String sessionToken,
            @RequestBody CorredorRequest request
    ) {
        storeAccessService.requireStoreAccess(sessionToken, request.getStoreId());

        CorredorEntity saved = corredorService.createCorredor(request.getNome(), request.getStoreId());
        if (saved == null) {
            return ResponseEntity.notFound().build();
        }

        ResponseEntity<CorredorResponde> body = ResponseEntity.status(HttpStatus.CREATED).body(toResponse(saved));
        return body;
    }

    @PutMapping("/{id}")
    public ResponseEntity<CorredorResponde> updateCorredor(
            @RequestHeader(name = "X-Session-Token", required = false) String sessionToken,
            @PathVariable Long id,
            @RequestBody CorredorRequest request
    ) {
        storeAccessService.requireStoreAccess(sessionToken, request.getStoreId());

        CorredorEntity updated = corredorService.updateCorredor(id, request.getNome(), request.getStoreId(), request.getVersion());
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(toResponse(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCorredor(
            @RequestHeader(name = "X-Session-Token", required = false) String sessionToken,
            @PathVariable Long id,
            @RequestParam Long storeId
    ) {
        storeAccessService.requireStoreAccess(sessionToken, storeId);
        boolean deleted = corredorService.deleteCorredor(id, storeId);
        if (!deleted) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/store/{storeId}")
    public ResponseEntity<List<CorredorResponde>> getByStore(@PathVariable Long storeId) {
        List<CorredorEntity> list = corredorService.getCorredores(storeId, null);
        List<CorredorResponde> resp = list.stream().map(this::toResponse).toList();
        return ResponseEntity.ok(resp);
    }

    private CorredorResponde toResponse(CorredorEntity entity) {
        CorredorResponde response = new CorredorResponde();
        response.setId(entity.getId());
        response.setName(entity.getNome());
        response.setStoreId(entity.getStore().getId());
        response.setVersion(entity.getVersion());
        return response;
    }
}
