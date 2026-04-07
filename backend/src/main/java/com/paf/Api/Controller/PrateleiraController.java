package com.paf.Api.Controller;

import com.paf.Api.Dto.PrateleiraRequest;
import com.paf.Api.Dto.PrateleiraResponse;
import com.paf.Domain.Services.PrateleiraService;
import com.paf.Domain.Services.StoreAccessService;
import com.paf.Infrastructure.Entities.PrateleiraEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<PrateleiraResponse> createPrateleiras(
            @RequestHeader(name = "X-Session-Token", required = false) String sessionToken,
            @RequestBody PrateleiraRequest req
    ) {
        storeAccessService.requireStoreAccess(sessionToken, req.getStoreId());

        PrateleiraEntity created = prateleiraService.createPrateleira(
                req.getName(),
                req.getCorredorId(),
                req.getStoreId(),
                req.getPosX(),
                req.getPosY(),
                req.getWidth(),
                req.getHeight()
        );
        if (created == null) {
            return ResponseEntity.notFound().build();
        }

        ResponseEntity<PrateleiraResponse> body = ResponseEntity.status(HttpStatus.CREATED).body(toResponse(created));
        return body;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePrateleiras(
            @RequestHeader(name = "X-Session-Token", required = false) String sessionToken,
            @PathVariable Long id,
            @RequestParam Long storeId
    ) {
        storeAccessService.requireStoreAccess(sessionToken, storeId);
        boolean ok = prateleiraService.deletePrateleira(id, storeId);
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<PrateleiraResponse> updatePrat(
            @RequestHeader(name = "X-Session-Token", required = false) String sessionToken,
            @PathVariable Long id,
            @RequestBody PrateleiraRequest req
    ) {
        storeAccessService.requireStoreAccess(sessionToken, req.getStoreId());

        PrateleiraEntity update = prateleiraService.updatePrateleira(
                id,
                req.getStoreId(),
                req.getName(),
                req.getCorredorId(),
                req.getPosX(),
                req.getPosY(),
                req.getWidth(),
                req.getHeight(),
                req.getVersion()
        );
        if (update == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(toResponse(update));
    }

    private PrateleiraResponse toResponse(PrateleiraEntity entity) {
        PrateleiraResponse response = new PrateleiraResponse();
        response.setId(entity.getId());
        response.setName(entity.getNome());
        response.setCorredorId(entity.getCorredor().getId());
        response.setStoreId(entity.getCorredor().getStore().getId());
        response.setCorredorName(entity.getCorredor().getNome());
        response.setPosX(entity.getPosX());
        response.setPosY(entity.getPosY());
        response.setWidth(entity.getWidth());
        response.setHeight(entity.getHeight());
        response.setVersion(entity.getVersion());
        response.setPinned(entity.getPosX() != null && entity.getPosY() != null);
        return response;
    }
}
