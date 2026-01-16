package com.paf.Api.Controller;

import com.paf.Api.Dto.ProdutosRequest;
import com.paf.Api.Dto.ProdutosResponse;
import com.paf.Domain.Models.ProdutoModel;
import com.paf.Domain.Services.ProdutoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/Prod")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true") // Resolve o erro de bloqueio
public class ProdutosController {

    private final ProdutoService produtoService;

    public ProdutosController(ProdutoService produtoService) {
        this.produtoService = produtoService;
    }

    // --- LISTAR (GET) ---
    // Resolve o erro "Required parameter 'nome' is not present"
    @GetMapping("/ProdGet")
    public ResponseEntity<List<ProdutosResponse>> getProdutos(@RequestParam(required = false) String nome) {
        List<ProdutoModel> models;

        // Se não vier nome, busca TODOS. Se vier, filtra.
        if (nome == null || nome.isEmpty()) {
            models = produtoService.getAll(); // Tens de garantir que este método existe no Service
        } else {
            // Nota: O ideal é o Service retornar uma Lista, mesmo que só encontre um
            ProdutoModel pm = produtoService.GetByName(nome);
            models = (pm != null) ? List.of(pm) : Collections.emptyList();
        }

        // Converte Models -> DTOs para o React
        List<ProdutosResponse> resp = models.stream()
                .map(m -> {
                    ProdutosResponse r = new ProdutosResponse();
                    r.setId(m.getId()); // Garante que tens o ID aqui
                    r.setNome(m.getNome());
                    r.setPreco(m.getPreco());
                    r.setDescricao(m.getDescricao());
                    r.setIdCorredor(m.getIdCorredor());
                    r.setIdPrateleira(m.getIdPrateleira());

                    return r;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(resp);
    }

    // --- CRIAR (POST) ---
    // Mudei para /ProdPost para alinhar com o api.js
    @PostMapping("/ProdPost")
    public ResponseEntity<ProdutosResponse> createProd(@RequestBody ProdutosRequest req) {
        if (req == null) return ResponseEntity.badRequest().build();

        // 1. Converter Request -> Model
        ProdutoModel model = new ProdutoModel();
        model.setNome(req.getNome());
        model.setDescricao(req.getDescricao());
        model.setPreco(req.getPreco());
        model.setIdCorredor(req.getIdCorredor());
        model.setIdPrateleira(req.getIdPrateleira());

        // 2. Chamar Service
        // Nota: O teu service deve retornar o Objeto criado (ProdutoModel) e não String
        ProdutoModel created = produtoService.createProdutoObject(model);

        // 3. Converter Model -> Response
        ProdutosResponse r = new ProdutosResponse();
        r.setId(created.getId());
        r.setNome(created.getNome());
        r.setPreco(created.getPreco());
        r.setDescricao(created.getDescricao());
        r.setIdCorredor(created.getIdCorredor());
        r.setIdPrateleira(created.getIdPrateleira());

        return ResponseEntity.status(HttpStatus.CREATED).body(r);
    }

    // --- APAGAR (DELETE) ---
    // Mudei para Query Param (?id=1) para alinhar com o api.js
    @DeleteMapping("/ProdDelete")
    public ResponseEntity<Void> deleteProd(@RequestParam Long id) {
        boolean ok = produtoService.deleteProduto(id);
        if (!ok) return ResponseEntity.notFound().build();
        return ResponseEntity.noContent().build();
    }

    // --- ATUALIZAR (PUT) ---
    @PutMapping("/AlterProd/{id}")
    public ResponseEntity<ProdutosResponse> updateProd(@PathVariable Long id, @RequestBody ProdutosRequest req) {
        ProdutoModel model = new ProdutoModel();
        model.setId(id);
        model.setNome(req.getNome());
        model.setDescricao(req.getDescricao());
        model.setPreco(req.getPreco());
        model.setIdCorredor(req.getIdCorredor());
        model.setIdPrateleira(req.getIdPrateleira());


        ProdutoModel updated = produtoService.UpdateProduto(model);
        if (updated == null) return ResponseEntity.notFound().build();

        ProdutosResponse r = new ProdutosResponse();
        r.setId(updated.getId());
        r.setNome(updated.getNome());
        r.setDescricao(updated.getDescricao());
        r.setPreco(updated.getPreco());
        r.setIdCorredor(updated.getIdCorredor());
        r.setIdPrateleira(updated.getIdPrateleira());

        return ResponseEntity.ok(r);
    }
}