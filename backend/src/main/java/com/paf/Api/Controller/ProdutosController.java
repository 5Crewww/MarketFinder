package com.paf.Api.Controller;

import com.paf.Api.Dto.ApiErrorResponse;
import com.paf.Api.Dto.BatchMoveProductsRequest;
import com.paf.Api.Dto.PagedResponse;
import com.paf.Api.Dto.ProdutosRequest;
import com.paf.Api.Dto.ProdutosResponse;
import com.paf.Domain.Services.ProdutoService;
import com.paf.Domain.Services.StoreAccessService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

import static org.springframework.http.ResponseEntity.*;

@RestController
@RequestMapping("/produtos")
@Validated
public class ProdutosController {

    private final ProdutoService produtoService;
    private final StoreAccessService storeAccessService;

    public ProdutosController(ProdutoService produtoService, StoreAccessService storeAccessService) {
        this.produtoService = produtoService;
        this.storeAccessService = storeAccessService;
    }

    @GetMapping
    public ResponseEntity<PagedResponse<ProdutosResponse>> getProdutos(
            @RequestParam @Positive Long storeId,
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) BigDecimal precoMin,
            @RequestParam(required = false) BigDecimal precoMax,
            @RequestParam(required = false) Boolean inStock,
            @RequestParam(defaultValue = "0") @PositiveOrZero int page,
            @RequestParam(defaultValue = "20") @Positive int size
    ) {
        return buildSearchResponse(storeId, nome, categoria, precoMin, precoMax, inStock, page, size);
    }

    @GetMapping("/public")
    public ResponseEntity<PagedResponse<ProdutosResponse>> getProdutosPublic(
            @RequestParam @Positive Long storeId,
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) BigDecimal precoMin,
            @RequestParam(required = false) BigDecimal precoMax,
            @RequestParam(required = false) Boolean inStock,
            @RequestParam(defaultValue = "0") @PositiveOrZero int page,
            @RequestParam(defaultValue = "20") @Positive int size
    ) {
        return buildSearchResponse(storeId, nome, categoria, precoMin, precoMax, inStock, page, size);
    }

    @GetMapping("/categorias")
    public ResponseEntity<List<String>> getCategorias(@RequestParam @Positive Long storeId) {
        return ok(produtoService.getCategorias(storeId));
    }

    @GetMapping("/public/categorias")
    public ResponseEntity<List<String>> getCategoriasPublic(@RequestParam @Positive Long storeId) {
        return ok(produtoService.getCategorias(storeId));
    }

    @PostMapping
    public ResponseEntity<?> createProd(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @Valid @RequestBody ProdutosRequest req
    ) {
        if (req == null) {
            return badRequest("Payload do produto em falta.");
        }
        if (req.getStoreId() == null) {
            return badRequest("O campo storeId e obrigatorio.");
        }
        if (req.getIdPrateleira() == null) {
            return badRequest("O campo idPrateleira e obrigatorio.");
        }
        if (req.getPreco() == null) {
            return badRequest("O campo preco e obrigatorio.");
        }
        if (req.getProductId() == null && (req.getNome() == null || req.getNome().isBlank())) {
            return badRequest("Informe o nome do produto ou um productId valido.");
        }

        storeAccessService.requireStoreAccess(authorizationHeader, req.getStoreId());

        ProdutosResponse created = produtoService.createProduto(req);
        if (created == null) {
            return badRequest("Produto invalido para a loja selecionada.");
        }
        return status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProd(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable @Positive Long id,
            @RequestParam(name = "storeId") @Positive Long storeId
    ) {
        storeAccessService.requireStoreAccess(authorizationHeader, storeId);
        boolean ok = produtoService.deleteProduto(id, storeId);
        if (!ok) return notFound().build();
        return noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProdutosResponse> updateProd(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable @Positive Long id,
            @Valid @RequestBody ProdutosRequest req
    ) {
        storeAccessService.requireStoreAccess(authorizationHeader, req.getStoreId());
        ProdutosResponse updated = produtoService.updateProduto(id, req);
        if (updated == null) return notFound().build();
        return ok(updated);
    }

    @PutMapping("/batch/move")
    public ResponseEntity<List<ProdutosResponse>> moveBatch(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @Valid @RequestBody BatchMoveProductsRequest request
    ) {
        storeAccessService.requireStoreAccess(authorizationHeader, request.getStoreId());
        return ok(produtoService.moveProdutosEmLote(request.getStoreId(), request.getTargetShelfId(), request.getItems()));
    }

    private ResponseEntity<ApiErrorResponse> badRequest(String message) {
        ApiErrorResponse response = new ApiErrorResponse();
        response.setMessage(message);
        response.setDetails(List.of(
                "Payload esperado: {\"nome\":\"Arroz\",\"descricao\":\"...\",\"categoria\":\"Mercearia\",\"preco\":2.99,\"stock\":10,\"idPrateleira\":1,\"storeId\":1}",
                "O idCorredor e derivado da prateleira escolhida e devolvido na resposta."
        ));
        return ResponseEntity.badRequest().body(response);
    }

    private ResponseEntity<PagedResponse<ProdutosResponse>> buildSearchResponse(
            Long storeId,
            String nome,
            String categoria,
            BigDecimal precoMin,
            BigDecimal precoMax,
            Boolean inStock,
            int page,
            int size
    ) {
        return ok(produtoService.search(storeId, nome, categoria, precoMin, precoMax, inStock, page, size));
    }
}
