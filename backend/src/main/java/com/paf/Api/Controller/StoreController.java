package com.paf.Api.Controller;

import com.paf.Api.Dto.StoreRequest;
import com.paf.Api.Dto.StoreResponse;
import com.paf.Domain.Services.StoreAccessService;
import com.paf.Domain.Services.StoreService;
import com.paf.Infrastructure.Entities.StoreEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.http.ResponseEntity.*;

@RestController
@RequestMapping("/stores")
public class StoreController {

    private final StoreService storeService;
    private final StoreAccessService storeAccessService;

    @Autowired
    public StoreController(StoreService storeService, StoreAccessService storeAccessService) {
        this.storeService = storeService;
        this.storeAccessService = storeAccessService;
    }

    @GetMapping
    public ResponseEntity<List<StoreResponse>> getStores() {
        return ok(buildStoreListResponse());
    }

    @GetMapping("/public")
    public ResponseEntity<List<StoreResponse>> getPublicStores() {
        return ok(buildStoreListResponse());
    }

    @GetMapping("/{id}")
    public ResponseEntity<StoreResponse> getStore(@PathVariable Long id) {
        return buildSingleStoreResponse(id);
    }

    @GetMapping("/public/{id}")
    public ResponseEntity<StoreResponse> getPublicStore(@PathVariable Long id) {
        return buildSingleStoreResponse(id);
    }

    @PutMapping("/{id}/layout")
    public ResponseEntity<StoreResponse> updateLayout(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable Long id,
            @RequestBody StoreRequest request
    ) {
        storeAccessService.requireStoreAccess(authorizationHeader, id);
        StoreEntity updated = storeService.updateLayout(id, request.getLayoutImageUrl(), request.getVersion());
        if (updated == null) {
            return notFound().build();
        }
        return ok(toResponse(updated));
    }

    private StoreResponse toResponse(StoreEntity store) {
        StoreResponse response = new StoreResponse();
        response.setId(store.getId());
        response.setName(store.getName());
        response.setLayoutImageUrl(store.getLayoutImageUrl());
        response.setLayoutConfigured(store.getLayoutImageUrl() != null && !store.getLayoutImageUrl().isBlank());
        response.setOwnerUserId(store.getOwner() != null ? store.getOwner().getId() : null);
        response.setVersion(store.getVersion());
        response.setMemberCount(store.getMemberships() != null ? store.getMemberships().size() : 0);
        return response;
    }

    private List<StoreResponse> buildStoreListResponse() {
        return storeService.getAll().stream().map(this::toResponse).toList();
    }

    private ResponseEntity<StoreResponse> buildSingleStoreResponse(Long id) {
        StoreEntity store = storeService.getById(id);
        if (store == null) {
            return notFound().build();
        }
        return ok(toResponse(store));
    }
}
