package com.paf.Domain.Services;

import com.paf.Api.Dto.BatchMoveProductsItemRequest;
import com.paf.Api.Dto.PagedResponse;
import com.paf.Api.Dto.ProdutosRequest;
import com.paf.Api.Dto.ProdutosResponse;
import com.paf.Infrastructure.Entities.InventoryEntity;
import com.paf.Infrastructure.Entities.PrateleiraEntity;
import com.paf.Infrastructure.Entities.ProductEntity;
import com.paf.Infrastructure.Entities.StoreEntity;
import com.paf.Infrastructure.Repository.InventoryRepository;
import com.paf.Infrastructure.Repository.PrateleiraRepository;
import com.paf.Infrastructure.Repository.ProdutoRepository;
import com.paf.Util.InputSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.apache.tomcat.util.http.RequestUtil.normalize;

@Service
public class ProdutoService {

    private final ProdutoRepository produtoRepository;
    private final PrateleiraRepository prateleiraRepository;
    private final InventoryRepository inventoryRepository;

    @Autowired
    public ProdutoService(
            ProdutoRepository produtoRepository,
            PrateleiraRepository prateleiraRepository,
            InventoryRepository inventoryRepository
    ) {
        this.produtoRepository = produtoRepository;
        this.prateleiraRepository = prateleiraRepository;
        this.inventoryRepository = inventoryRepository;
    }

    public PagedResponse<ProdutosResponse> search(
            Long storeId,
            String nome,
            String categoria,
            BigDecimal precoMin,
            BigDecimal precoMax,
            Boolean inStock,
            int page,
            int size
    ) {
        validateSearchRequest(storeId, precoMin, precoMax);

        int pagina = Math.max(page, 0);
        int tamanhoPagina = Math.max(1, Math.min(size, 100));
        Pageable pageable = PageRequest.of(pagina, tamanhoPagina);

        String nomeLimpo = InputSanitizer.normalizeSearch(nome);
        String categoriaLimpa = InputSanitizer.sanitizeText(categoria, 120);
        Long precoMinCentavos = priceToCentsNullable(precoMin);
        Long precoMaxCentavos = priceToCentsNullable(precoMax);

        Page<InventoryEntity> resultadoBusca = inventoryRepository.searchInventory(
                storeId,
                nomeLimpo,
                categoriaLimpa,
                precoMinCentavos,
                precoMaxCentavos,
                inStock,
                pageable
        );

        List<ProdutosResponse> produtos = new ArrayList<>(resultadoBusca.getNumberOfElements());
        for (InventoryEntity inventory : resultadoBusca.getContent()) {
            produtos.add(buildResponse(inventory));
        }

        PagedResponse<ProdutosResponse> response = new PagedResponse<>();
        response.setContent(produtos);
        response.setPage(resultadoBusca.getNumber());
        response.setSize(resultadoBusca.getSize());
        response.setTotalElements(resultadoBusca.getTotalElements());
        response.setTotalPages(resultadoBusca.getTotalPages());
        response.setHasNext(resultadoBusca.hasNext());
        return response;
    }

    public List<String> getCategorias(Long storeId) {
        requirePositiveId(storeId, "A loja do produto e obrigatoria.");
        return inventoryRepository.findDistinctCategoriesByStoreId(storeId);
    }

    @Transactional
    public ProdutosResponse createProduto(ProdutosRequest request) {
        cleanRequest(request);
        validateCreateRequest(request);

        PrateleiraEntity prateleira = requireShelf(request.getIdPrateleira(), request.getStoreId());
        StoreEntity store = requireStoreBinding(prateleira, request.getStoreId());
        ProductEntity produto = createProductFromRequest(request);

        InventoryEntity inventory = new InventoryEntity();
        inventory.setStore(store);
        inventory.setProduct(produto);
        inventory.setShelf(prateleira);
        inventory.setPriceCents(priceToCentsRequired(request.getPreco()));
        inventory.setStockQty(request.getStock() == null ? 0 : request.getStock());

        InventoryEntity inventorySalvo = inventoryRepository.saveAndFlush(inventory);
        InventoryEntity inventoryPersistido = inventoryRepository.findByIdAndStoreId(
                inventorySalvo.getId(),
                store.getId()
        ).orElse(inventorySalvo);
        return buildResponse(inventoryPersistido);
    }

    @Transactional
    public ProdutosResponse updateProduto(Long inventoryId, ProdutosRequest request) {
        cleanRequest(request);
        validateUpdateRequest(inventoryId, request);

        InventoryEntity inventory = inventoryRepository.findByIdAndStoreId(
                inventoryId,
                request.getStoreId()
        ).orElse(null);
        if (inventory == null) {
            return null;
        }

        validateVersion(inventory.getVersion(), request.getVersion());

        Long oldProductId = inventory.getProduct() != null ? inventory.getProduct().getId() : null;
        ProductEntity resolvedProduct = resolveProductForUpdate(inventory, request);
        inventory.setProduct(resolvedProduct);

        if (request.getIdPrateleira() != null && !request.getIdPrateleira().equals(inventory.getShelf().getId())) {
            inventory.setShelf(requireShelf(request.getIdPrateleira(), request.getStoreId()));
        }

        if (request.getPreco() != null) {
            inventory.setPriceCents(priceToCentsRequired(request.getPreco()));
        }
        if (request.getStock() != null) {
            inventory.setStockQty(request.getStock());
        }

        InventoryEntity inventoryAtualizado = inventoryRepository.save(inventory);

        if (oldProductId != null && inventoryAtualizado.getProduct() != null
                && !oldProductId.equals(inventoryAtualizado.getProduct().getId())) {
            cleanupOrphanProducts();
        }

        return buildResponse(inventoryAtualizado);
    }

    @Transactional
    public boolean deleteProduto(Long inventoryId, Long storeId) {
        requirePositiveId(inventoryId, "Identificador do inventario invalido.");
        requirePositiveId(storeId, "A loja do produto e obrigatoria.");

        InventoryEntity inventory = inventoryRepository.findByIdAndStoreId(inventoryId, storeId).orElse(null);
        if (inventory == null) {
            return false;
        }

        inventoryRepository.delete(inventory);
        cleanupOrphanProducts();
        return true;
    }

    @Transactional
    public List<ProdutosResponse> moveProdutosEmLote(Long storeId, Long targetShelfId, List<BatchMoveProductsItemRequest> items) {
        requirePositiveId(storeId, "A loja do produto e obrigatoria.");
        requirePositiveId(targetShelfId, "Prateleira de destino inválida.");

        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("Pedido de movimentação inválido.");
        }

        PrateleiraEntity prateleiraDestino = requireShelf(targetShelfId, storeId);

        Set<Long> inventoryIds = new LinkedHashSet<>();
        for (BatchMoveProductsItemRequest item : items) {
            if (item == null || item.getInventoryId() == null || item.getInventoryId() <= 0) {
                throw new IllegalArgumentException("Produto inválido na operação em lote.");
            }
            if (item.getVersion() == null) {
                throw new IllegalArgumentException("Versão do produto em falta na operação em lote.");
            }
            inventoryIds.add(item.getInventoryId());
        }

        List<InventoryEntity> inventarios = inventoryRepository.findByIdInAndStoreId(new ArrayList<>(inventoryIds), storeId);
        if (inventarios.size() != inventoryIds.size()) {
            throw new IllegalArgumentException("Um ou mais produtos selecionados não pertencem à loja.");
        }

        Map<Long, InventoryEntity> inventarioPorId = new HashMap<>();
        for (InventoryEntity inventario : inventarios) {
            inventarioPorId.put(inventario.getId(), inventario);
        }

        for (BatchMoveProductsItemRequest item : items) {
            InventoryEntity inventario = inventarioPorId.get(item.getInventoryId());
            if (inventario == null) {
                throw new IllegalArgumentException("Produto inválido na operação em lote.");
            }
            validateVersion(inventario.getVersion(), item.getVersion());
            inventario.setShelf(prateleiraDestino);
        }

        List<InventoryEntity> inventariosSalvos = inventoryRepository.saveAll(inventarios);
        inventariosSalvos.sort(Comparator.comparing(InventoryEntity::getId));

        List<ProdutosResponse> resposta = new ArrayList<>(inventariosSalvos.size());
        for (InventoryEntity inventario : inventariosSalvos) {
            resposta.add(buildResponse(inventario));
        }
        return resposta;
    }

    @Transactional
    public int cleanupOrphanProducts() {
        return produtoRepository.deleteOrphanProducts();
    }

    private ProductEntity resolveProductForUpdate(InventoryEntity inventory, ProdutosRequest request) {
        boolean hasMetadataUpdates = request.getNome() != null
                || request.getDescricao() != null
                || request.getCategoria() != null;

        if (request.getProductId() != null && !request.getProductId().equals(inventory.getProduct().getId())) {
            ProductEntity baseProduct = produtoRepository.findById(request.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException("Produto base não encontrado."));
            ProductEntity clonedProduct = cloneProduct(baseProduct);
            applyProductFields(clonedProduct, request);
            return produtoRepository.save(clonedProduct);
        }

        if (!hasMetadataUpdates) {
            return inventory.getProduct();
        }

        ProductEntity currentProduct = inventory.getProduct();
        if (isProductShared(currentProduct.getId())) {
            ProductEntity clonedProduct = cloneProduct(currentProduct);
            applyProductFields(clonedProduct, request);
            return produtoRepository.save(clonedProduct);
        }

        applyProductFields(currentProduct, request);
        return produtoRepository.save(currentProduct);
    }

    private boolean isProductShared(Long productId) {
        return inventoryRepository.countByProductId(productId) > 1;
    }

    private ProductEntity createProductFromRequest(ProdutosRequest request) {
        ProductEntity product;

        if (request.getProductId() != null) {
            ProductEntity baseProduct = produtoRepository.findById(request.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException("Produto base não encontrado."));
            product = cloneProduct(baseProduct);
        } else {
            if (request.getNome() == null) {
                throw new IllegalArgumentException("O nome do produto e obrigatorio.");
            }
            product = new ProductEntity();
            product.setNome(request.getNome().trim());
            product.setNormalizedNome(normalize(request.getNome().trim()));
            product.setDescricao(request.getDescricao());
            product.setCategoria(request.getCategoria());
        }

        applyProductFields(product, request);
        return produtoRepository.save(product);
    }

    private ProductEntity cloneProduct(ProductEntity source) {
        ProductEntity clone = new ProductEntity();
        clone.setNome(source.getNome());
        clone.setNormalizedNome(source.getNormalizedNome());
        clone.setDescricao(source.getDescricao());
        clone.setCategoria(source.getCategoria());
        return clone;
    }

    private void applyProductFields(ProductEntity product, ProdutosRequest request) {
        if (request.getNome() != null) {
            String nomeLimpo = request.getNome().trim();
            if (nomeLimpo.isBlank()) {
                throw new IllegalArgumentException("O nome do produto e obrigatorio.");
            }
            product.setNome(nomeLimpo);
            product.setNormalizedNome(normalize(nomeLimpo));
        }

        if (request.getDescricao() != null) {
            product.setDescricao(request.getDescricao());
        }

        if (request.getCategoria() != null) {
            product.setCategoria(request.getCategoria());
        }

        if (product.getNome() == null || product.getNome().isBlank()) {
            throw new IllegalArgumentException("O nome do produto e obrigatorio.");
        }

        if (product.getNormalizedNome() == null || product.getNormalizedNome().isBlank()) {
            product.setNormalizedNome(normalize(product.getNome()));
        }
    }

    private ProdutosResponse buildResponse(InventoryEntity inventory) {
        ProdutosResponse response = new ProdutosResponse();
        response.setId(inventory.getId());
        response.setProductId(inventory.getProduct().getId());
        response.setNome(inventory.getProduct().getNome());
        response.setDescricao(inventory.getProduct().getDescricao());
        response.setCategoria(inventory.getProduct().getCategoria());
        response.setPreco(centsToPrice(inventory.getPriceCents()));
        response.setStock(inventory.getStockQty());
        response.setVersion(inventory.getVersion());

        if (inventory.getStore() != null) {
            response.setStoreId(inventory.getStore().getId());
            response.setStoreName(inventory.getStore().getName());
        }

        PrateleiraEntity shelf = inventory.getShelf();
        if (shelf != null) {
            response.setIdPrateleira(shelf.getId());
            response.setNomePrateleira(shelf.getNome());
            response.setPosXPrateleira(shelf.getPosX());
            response.setPosYPrateleira(shelf.getPosY());

            if (shelf.getCorredor() != null) {
                response.setIdCorredor(shelf.getCorredor().getId());
                response.setNomeCorredor(shelf.getCorredor().getNome());
            }
        }

        return response;
    }

    private PrateleiraEntity requireShelf(Long shelfId, Long storeId) {
        PrateleiraEntity prateleira = prateleiraRepository.findByIdAndCorredorStoreId(shelfId, storeId).orElse(null);
        if (prateleira == null) {
            throw new IllegalArgumentException("A prateleira selecionada nao pertence a loja indicada.");
        }
        return prateleira;
    }

    private StoreEntity requireStoreBinding(PrateleiraEntity prateleira, Long storeId) {
        if (prateleira == null || prateleira.getCorredor() == null || prateleira.getCorredor().getStore() == null) {
            throw new IllegalArgumentException("Nao foi possivel determinar a loja da prateleira selecionada.");
        }

        StoreEntity store = prateleira.getCorredor().getStore();
        if (store.getId() == null || !storeId.equals(store.getId())) {
            throw new IllegalArgumentException("A prateleira selecionada nao pertence a loja indicada.");
        }

        return store;
    }

    private void validateSearchRequest(Long storeId, BigDecimal precoMin, BigDecimal precoMax) {
        requirePositiveId(storeId, "A loja do produto e obrigatoria.");

        if (precoMin != null && precoMin.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Preço mínimo inválido.");
        }
        if (precoMax != null && precoMax.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Preço máximo inválido.");
        }
        if (precoMin != null && precoMax != null && precoMin.compareTo(precoMax) > 0) {
            throw new IllegalArgumentException("O preço mínimo não pode ser maior que o preço máximo.");
        }
    }

    private void validateCreateRequest(ProdutosRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Pedido de produto em falta.");
        }

        requirePositiveId(request.getStoreId(), "A loja do produto e obrigatoria.");
        requirePositiveId(request.getIdPrateleira(), "A prateleira do produto e obrigatoria.");

        if (request.getPreco() == null) {
            throw new IllegalArgumentException("O preco do produto e obrigatorio.");
        }

        if (request.getProductId() != null && request.getProductId() <= 0) {
            throw new IllegalArgumentException("Identificador do produto inválido.");
        }

        if (request.getProductId() == null && (request.getNome() == null || request.getNome().isBlank())) {
            throw new IllegalArgumentException("O nome do produto e obrigatorio.");
        }
    }

    private void validateUpdateRequest(Long inventoryId, ProdutosRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Pedido de produto em falta.");
        }

        requirePositiveId(inventoryId, "Identificador do inventario invalido.");
        requirePositiveId(request.getStoreId(), "A loja do produto e obrigatoria.");

        if (request.getProductId() != null && request.getProductId() <= 0) {
            throw new IllegalArgumentException("Identificador do produto inválido.");
        }

        if (request.getIdPrateleira() != null && request.getIdPrateleira() <= 0) {
            throw new IllegalArgumentException("A prateleira do produto e invalida.");
        }
    }

    private void validateVersion(Long currentVersion, Long requestVersion) {
        if (requestVersion == null || currentVersion == null || !requestVersion.equals(currentVersion)) {
            throw new OptimisticLockingFailureException("Um dos produtos foi alterado por outro utilizador.");
        }
    }

    private void cleanRequest(ProdutosRequest request) {
        if (request == null) {
            return;
        }

        request.setNome(InputSanitizer.sanitizeText(request.getNome(), 160));
        request.setDescricao(InputSanitizer.sanitizeText(request.getDescricao(), 1000));
        request.setCategoria(InputSanitizer.sanitizeText(request.getCategoria(), 120));

        if (request.getPreco() != null && request.getPreco().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Preço inválido.");
        }
        if (request.getStock() != null && request.getStock() < 0) {
            throw new IllegalArgumentException("Stock inválido.");
        }
    }

    private void requirePositiveId(Long value, String message) {
        if (value == null || value <= 0) {
            throw new IllegalArgumentException(message);
        }
    }

    private Long priceToCentsRequired(BigDecimal price) {
        if (price == null) {
            throw new IllegalArgumentException("O preco do produto e obrigatorio.");
        }
        return price.setScale(2, RoundingMode.HALF_UP)
                .movePointRight(2)
                .longValueExact();
    }

    private Long priceToCentsNullable(BigDecimal price) {
        if (price == null) {
            return null;
        }
        return priceToCentsRequired(price);
    }

    private BigDecimal centsToPrice(Long cents) {
        if (cents == null) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(cents, 2);
    }
}
