package com.paf.Api.Controller;

import com.paf.Api.Dto.PrateleiraRequest;
import com.paf.Api.Dto.PrateleiraResponse;
import com.paf.Domain.Services.PrateleiraService;
import com.paf.Domain.Services.StoreAccessService;
import com.paf.Infrastructure.Entities.PrateleiraEntity;
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
@RequestMapping("/prateleiras")
public class PrateleiraController {

    private final PrateleiraService prateleiraService;
    private final StoreAccessService storeAccessService;

    @Autowired
    public PrateleiraController(PrateleiraService prateleiraService, StoreAccessService storeAccessService) {
        this.prateleiraService = prateleiraService;
        this.storeAccessService = storeAccessService;
    }

    @GetMapping
    public ResponseEntity<List<PrateleiraResponse>> getPrateleiras(
            @RequestParam Long storeId,
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) Long corredorId
    ) {
        List<PrateleiraEntity> entities;

        if (corredorId != null) {
            entities = prateleiraService.getByCorredor(storeId, corredorId);
        } else if (nome == null || nome.isBlank()) {
            entities = prateleiraService.getAll(storeId);
        } else {
            entities = prateleiraService.getByName(storeId, nome);
        }

        List<PrateleiraResponse> response = entities.stream().map(this::toResponse).toList();
        return ok(response);
    }

    @PostMapping
    public ResponseEntity<PrateleiraResponse> createPrateleiras(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @Valid @RequestBody PrateleiraRequest req
    ) {
        storeAccessService.requireStoreAccess(authorizationHeader, req.getStoreId());

        PrateleiraEntity created = prateleiraService.createPrateleira(
                sanitizeText(req.getName()),
                req.getCorredorId(),
                req.getStoreId(),
                req.getPosX(),
                req.getPosY(),
                req.getWidth(),
                req.getHeight()
        );
        if (created == null) {
            return notFound().build();
        }

        ResponseEntity<PrateleiraResponse> body = status(HttpStatus.CREATED).body(toResponse(created));
        return body;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePrateleiras(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable Long id,
            @RequestParam Long storeId
    ) {
        storeAccessService.requireStoreAccess(authorizationHeader, storeId);
        boolean ok = prateleiraService.deletePrateleira(id, storeId);
        if (!ok) {
            return notFound().build();
        }
        return noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<PrateleiraResponse> updatePrat(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable Long id,
            @Valid @RequestBody PrateleiraRequest req
    ) {
        storeAccessService.requireStoreAccess(authorizationHeader, req.getStoreId());

        PrateleiraEntity update = prateleiraService.updatePrateleira(
                id,
                req.getStoreId(),
                sanitizeText(req.getName()),
                req.getCorredorId(),
                req.getPosX(),
                req.getPosY(),
                req.getWidth(),
                req.getHeight(),
                req.getVersion()
        );
        if (update == null) {
            return notFound().build();
        }

        return ok(toResponse(update));
    }

    private PrateleiraResponse toResponse(PrateleiraEntity entity) {
        PrateleiraResponse response = new PrateleiraResponse();
        response.setId(entity.getId());
        response.setName(sanitizeText(entity.getNome()));
        response.setCorredorId(entity.getCorredor().getId());
        response.setStoreId(entity.getCorredor().getStore().getId());
        response.setCorredorName(sanitizeText(entity.getCorredor().getNome()));
        response.setPosX(entity.getPosX());
        response.setPosY(entity.getPosY());
        response.setWidth(entity.getWidth());
        response.setHeight(entity.getHeight());
        response.setVersion(entity.getVersion());
        response.setPinned(entity.getPosX() != null && entity.getPosY() != null);
        return response;
    }

    private String sanitizeText(String value) {
        return InputSanitizer.sanitizeText(value, 120);
    }
}
