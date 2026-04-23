package com.paf.Api.Controller;

import com.paf.Api.Dto.StoreRequest;
import com.paf.Api.Dto.StoreResponse;
import com.paf.Domain.Services.StoreAccessService;
import com.paf.Domain.Services.StoreService;
import com.paf.Infrastructure.Entities.StoreEntity;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
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

    @PutMapping("/{id}")
    public ResponseEntity<StoreResponse> updateStore(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable Long id,
            @Valid @RequestBody StoreRequest request
    ) {
        storeAccessService.requireStoreAccess(authorizationHeader, id);
        StoreEntity updated = storeService.updateDetails(
                id,
                request.getName(),
                request.getLocation(),
                request.getDescription(),
                request.getVersion()
        );
        if (updated == null) {
            return notFound().build();
        }
        return ok(toResponse(updated));
    }

    @PutMapping("/{id}/layout")
    public ResponseEntity<StoreResponse> updateLayout(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable Long id,
            @Valid @RequestBody StoreRequest request
    ) {
        storeAccessService.requireStoreAccess(authorizationHeader, id);
        StoreEntity updated = storeService.updateLayout(id, request.getLayoutImageUrl(), request.getVersion());
        if (updated == null) {
            return notFound().build();
        }
        return ok(toResponse(updated));
    }

    @PostMapping(value = "/{id}/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<StoreResponse> uploadLogo(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable Long id,
            @RequestParam("logo") MultipartFile logo
    ) {
        storeAccessService.requireStoreAccess(authorizationHeader, id);

        if (logo == null || logo.isEmpty()) {
            throw new IllegalArgumentException("Ficheiro de logótipo vazio.");
        }
        if (logo.getSize() > 5L * 1024 * 1024) {
            throw new IllegalArgumentException("Logótipo demasiado grande. Máximo permitido: 5MB.");
        }

        byte[] bytes;
        try {
            bytes = logo.getBytes();
        } catch (IOException e) {
            throw new IllegalArgumentException("Não foi possível ler o ficheiro enviado.");
        }

        String contentType = detectImageContentType(bytes);
        if (contentType == null) {
            throw new IllegalArgumentException(
                    "Formato inválido. Apenas imagens JPEG e PNG são aceites."
            );
        }

        StoreEntity updated = storeService.uploadLogo(id, bytes, contentType);
        if (updated == null) {
            return notFound().build();
        }
        return ok(toResponse(updated));
    }

    @GetMapping("/{id}/logo")
    public ResponseEntity<byte[]> getLogo(@PathVariable Long id) {
        StoreEntity store = storeService.getById(id);
        if (store == null || store.getLogoData() == null || store.getLogoData().length == 0) {
            return notFound().build();
        }
        String contentType = store.getLogoContentType() != null
                ? store.getLogoContentType()
                : MediaType.IMAGE_JPEG_VALUE;
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .body(store.getLogoData());
    }

    private StoreResponse toResponse(StoreEntity store) {
        StoreResponse response = new StoreResponse();
        response.setId(store.getId());
        response.setName(store.getName());
        response.setLocation(store.getLocation());
        response.setDescription(store.getDescription());
        response.setLayoutImageUrl(store.getLayoutImageUrl());
        response.setLayoutConfigured(store.getLayoutImageUrl() != null && !store.getLayoutImageUrl().isBlank());
        response.setHasLogo(store.getLogoData() != null && store.getLogoData().length > 0);
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

    /**
     * Valida o MIME Type real do ficheiro pelos seus magic bytes.
     * Não confia na extensão nem no Content-Type declarado pelo browser.
     *
     * @return "image/jpeg", "image/png", ou null se inválido
     */
    private String detectImageContentType(byte[] bytes) {
        if (bytes == null || bytes.length < 4) {
            return null;
        }
        // JPEG: FF D8 FF
        if ((bytes[0] & 0xFF) == 0xFF
                && (bytes[1] & 0xFF) == 0xD8
                && (bytes[2] & 0xFF) == 0xFF) {
            return MediaType.IMAGE_JPEG_VALUE;
        }
        // PNG: 89 50 4E 47
        if ((bytes[0] & 0xFF) == 0x89
                && bytes[1] == 0x50
                && bytes[2] == 0x4E
                && bytes[3] == 0x47) {
            return MediaType.IMAGE_PNG_VALUE;
        }
        return null;
    }
}
