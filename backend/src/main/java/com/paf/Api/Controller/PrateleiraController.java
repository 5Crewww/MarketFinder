package com.paf.Api.Controller;

import com.paf.Api.Dto.PrateleiraRequest;
import com.paf.Api.Dto.PrateleiraResponse;
import com.paf.Domain.Models.PrateleirasModel;
import com.paf.Domain.Services.PrateleiraService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/Prateleira")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true") // Importante para o React
public class PrateleiraController {

    private final PrateleiraService prateleiraService;

    @Autowired
    public PrateleiraController(PrateleiraService prateleiraService) {
        this.prateleiraService = prateleiraService;
    }

    // --- LISTAR (GET) ---
    // Endpoint: http://localhost:8080/Prateleira/PGet?nome=...
    @GetMapping("/PGet")
    public ResponseEntity<List<PrateleiraResponse>> getPrateleiras(@RequestParam(required = false) String nome) {
        List<PrateleirasModel> models;

        if (nome == null || nome.isEmpty()) {
            models = prateleiraService.getAll();
        } else {
            models = prateleiraService.getByName(nome);
        }

        // Converter Models para DTOs
        List<PrateleiraResponse> resp = models.stream()
                .map(PrateleiraResponse::fromModel)
                .collect(Collectors.toList());

        // Retorna SEMPRE 200 OK, mesmo que a lista esteja vazia ([]).
        // Assim o React não falha ao fazer .json()
        return ResponseEntity.ok(resp);
    }

    // --- CRIAR (POST) ---
    // Endpoint: http://localhost:8080/Prateleira/PPost
    @PostMapping("/PPost")
    public ResponseEntity<PrateleiraResponse> create(@RequestBody PrateleiraRequest req) {
        if (req == null || req.getName() == null || req.getCorredorId() == null) {
            return ResponseEntity.badRequest().build();
        }

        // 1. Converter Request DTO -> Model
        PrateleirasModel model = new PrateleirasModel();
        model.setName(req.getName());
        model.setCorredorId(req.getCorredorId());
        model.setPosX(req.getPosX());
        model.setPosY(req.getPosY());
        model.setWidth(req.getWidth());
        model.setHeight(req.getHeight());


        // 2. Chamar o Serviço
        // Nota: O Service precisa de retornar o Model criado, não uma String
        PrateleirasModel created = prateleiraService.createPrateleira(model);

        // 3. Converter Model -> Response DTO
        return ResponseEntity.status(HttpStatus.CREATED).body(PrateleiraResponse.fromModel(created));
    }

    // --- APAGAR (DELETE) ---
    // Endpoint: http://localhost:8080/Prateleira/PDelete?id=...
    @DeleteMapping("/PDelete")
    public ResponseEntity<Void> delete(@RequestParam Long id) { // Nota: @RequestParam para bater certo com api.js (?id=1)
        boolean ok = prateleiraService.deletePrateleira(id);
        if (!ok) return ResponseEntity.notFound().build();
        return ResponseEntity.noContent().build();
    }
}