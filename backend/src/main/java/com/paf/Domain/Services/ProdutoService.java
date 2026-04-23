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
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import static org.apache.tomcat.util.http.RequestUtil.normalize;

@Service
public class ProdutoService {

    @PersistenceContext
    private EntityManager entityManager;

    private final ProdutoRepository produtoRepository;
    private final PrateleiraRepository prateleiraRepository;
    private final InventoryRepository inventoryRepository;

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

    /**
     * Match-List: encontra produtos cujo nome OU categoria contenha algum dos termos fornecidos.
     *
     * Tolerancia a erros de escrita (Case-Insensitive estrito e Stemming dinamico):
     *   - Stemming: se a palavra tiver < 4 letras ("sal", "pão"), usa a palavra inteira.
     *     Se tiver 4 ou mais ("esparguete"), corta para as primeiras 4 letras ("espa")
     *     para perdoar erros no sufixo e usa ILIKE dinâmico (cb.lower + cb.like).
     *
     * @param storeId  loja onde pesquisar
     * @param termos   lista de strings (texto bruto do textarea, uma por linha)
     * @return lista de ProdutosResponse agrupavel por corredor no frontend
     */
    public List<ProdutosResponse> matchByTermList(Long storeId, List<String> termos) {
        requirePositiveId(storeId, "A loja do produto e obrigatoria.");

        List<String> termosLimpos = termos == null ? List.of() : termos.stream()
                .filter(t -> t != null && !t.isBlank())
                .map(t -> t.trim().toLowerCase(Locale.ROOT))
                .distinct()
                .limit(30)
                .toList();

        if (termosLimpos.isEmpty()) {
            return List.of();
        }

        // --- Criteria API: construcao dinamica do ILIKE (OR) ---
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<InventoryEntity> cq = cb.createQuery(InventoryEntity.class);
        Root<InventoryEntity> inv = cq.from(InventoryEntity.class);

        // Join normal para usar na clausula WHERE (sem misturar com fetches)
        Join<Object, Object> product = inv.join("product", JoinType.INNER);

        // Filtro da Loja
        Predicate storeFilter = cb.equal(inv.get("store").get("id"), storeId);

        // Filtros dinamicos OR
        List<Predicate> termPredicates = new ArrayList<>();
        for (String termo : termosLimpos) {
            String stem = termo.length() < 4 ? termo : termo.substring(0, 4);
            String pattern = "%" + stem + "%";
            
            // Estritamente Case-Insensitive (ILIKE equivalente)
            Predicate nomeLike      = cb.like(cb.lower(product.get("nome")),      pattern);
            Predicate categoriaLike = cb.like(cb.lower(product.get("categoria")), pattern);
            termPredicates.add(cb.or(nomeLike, categoriaLike));
        }

        // Condicao final: Loja E (Termo1 OU Termo2 OU ...)
        cq.where(cb.and(storeFilter, cb.or(termPredicates.toArray(new Predicate[0]))));
        cq.distinct(true);

        // --- EntityGraph: resolve o N+1 sem corromper a arvore do CriteriaBuilder ---
        jakarta.persistence.EntityGraph<InventoryEntity> graph = entityManager.createEntityGraph(InventoryEntity.class);
        graph.addAttributeNodes("product", "store");
        graph.addSubgraph("shelf").addAttributeNodes("corredor");

        jakarta.persistence.TypedQuery<InventoryEntity> query = entityManager.createQuery(cq);
        query.setHint("jakarta.persistence.loadgraph", graph);

        List<InventoryEntity> inventarios = query.getResultList();

        return inventarios.stream()
                .map(this::buildResponse)
                .toList();
    }

    @Transactional
    public List<ProdutosResponse> importProdutosCsv(Long storeId, MultipartFile file) {
        requirePositiveId(storeId, "A loja do produto e obrigatoria.");
        validateCsvFile(file);

        List<ProdutosResponse> importedProducts = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            int lineNumber = 0;
            boolean headerProcessed = false;

            while ((line = reader.readLine()) != null) {
                lineNumber++;
                line = stripUtf8Bom(line);

                if (line.isBlank()) {
                    continue;
                }

                List<String> columns = parseCsvLine(line, lineNumber);
                if (!headerProcessed && isCsvHeader(columns)) {
                    headerProcessed = true;
                    continue;
                }

                headerProcessed = true;
                importedProducts.add(importCsvRow(storeId, columns, lineNumber));
            }
        } catch (IOException exception) {
            throw new IllegalArgumentException("Nao foi possivel ler o ficheiro CSV.");
        }

        if (importedProducts.isEmpty()) {
            throw new IllegalArgumentException("O ficheiro CSV nao contem produtos para importar.");
        }

        return importedProducts;
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

        InventoryEntity inventoryAtualizado = inventoryRepository.saveAndFlush(inventory);

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
        inventoryRepository.flush();
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
                || request.getMarca() != null
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

    private ProdutosResponse importCsvRow(Long storeId, List<String> columns, int lineNumber) {
        if (columns.size() != 6) {
            throw new IllegalArgumentException("Linha " + lineNumber + ": formato CSV inválido. Esperadas 6 colunas.");
        }

        String nome = sanitizeRequiredCsvField(columns.get(0), 160, "Nome", lineNumber);
        String descricao = sanitizeOptionalCsvField(columns.get(1), 1000);
        String categoria = sanitizeOptionalCsvField(columns.get(2), 120);
        String marca = sanitizeOptionalCsvField(columns.get(3), 120);
        BigDecimal preco = parseCsvPrice(columns.get(4), lineNumber);
        Long shelfId = parseCsvShelfId(columns.get(5), lineNumber);

        PrateleiraEntity shelf = requireShelf(shelfId, storeId);
        StoreEntity store = requireStoreBinding(shelf, storeId);
        String normalizedNome = normalize(nome);

        List<InventoryEntity> existingInventories = inventoryRepository.findActiveByStoreIdAndProductMetadata(
                storeId,
                normalizedNome,
                categoria,
                descricao,
                marca
        );

        InventoryEntity inventory = existingInventories.isEmpty() ? null : existingInventories.get(0);
        if (inventory != null) {
            inventory.setShelf(shelf);
            inventory.setPriceCents(priceToCentsRequired(preco));
            return buildResponse(inventoryRepository.save(inventory));
        }

        ProductEntity product = new ProductEntity();
        product.setNome(nome);
        product.setNormalizedNome(normalizedNome);
        product.setDescricao(descricao);
        product.setCategoria(categoria);
        product.setMarca(marca);
        ProductEntity savedProduct = produtoRepository.save(product);

        InventoryEntity newInventory = new InventoryEntity();
        newInventory.setStore(store);
        newInventory.setProduct(savedProduct);
        newInventory.setShelf(shelf);
        newInventory.setPriceCents(priceToCentsRequired(preco));
        newInventory.setStockQty(0);
        return buildResponse(inventoryRepository.save(newInventory));
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
            product.setMarca(InputSanitizer.sanitizeText(request.getMarca(), 120));
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
        clone.setMarca(source.getMarca());
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

        if (request.getMarca() != null) {
            product.setMarca(InputSanitizer.sanitizeText(request.getMarca(), 120));
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
        response.setMarca(inventory.getProduct().getMarca());
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
        if (requestVersion == null || currentVersion == null || !currentVersion.equals(requestVersion)) {
            throw new OptimisticLockingFailureException("Um dos produtos foi alterado por outro utilizador.");
        }
    }

    private void cleanRequest(ProdutosRequest request) {
        if (request == null) {
            return;
        }

        request.setNome(InputSanitizer.sanitizeText(request.getNome(), 160));
        request.setDescricao(InputSanitizer.sanitizeText(request.getDescricao(), 1000));
        request.setMarca(InputSanitizer.sanitizeText(request.getMarca(), 120));
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

    private void validateCsvFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("O ficheiro CSV é obrigatório.");
        }
    }

    private String stripUtf8Bom(String value) {
        if (value == null || value.isEmpty()) {
            return value;
        }
        return value.charAt(0) == '\uFEFF' ? value.substring(1) : value;
    }

    private boolean isCsvHeader(List<String> columns) {
        if (columns.size() != 6) {
            return false;
        }

        return "nome".equalsIgnoreCase(stripCsvCell(columns.get(0)))
                && "descricao".equalsIgnoreCase(stripCsvCell(columns.get(1)))
                && "categoria".equalsIgnoreCase(stripCsvCell(columns.get(2)))
                && "marca".equalsIgnoreCase(stripCsvCell(columns.get(3)))
                && "preco".equalsIgnoreCase(stripCsvCell(columns.get(4)))
                && "idprateleira".equalsIgnoreCase(stripCsvCell(columns.get(5)).replace("_", ""));
    }

    private List<String> parseCsvLine(String line, int lineNumber) {
        List<String> columns = new ArrayList<>();
        StringBuilder currentValue = new StringBuilder();
        boolean inQuotes = false;

        for (int index = 0; index < line.length(); index++) {
            char currentChar = line.charAt(index);

            if (currentChar == '"') {
                if (inQuotes && index + 1 < line.length() && line.charAt(index + 1) == '"') {
                    currentValue.append('"');
                    index++;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (currentChar == ',' && !inQuotes) {
                columns.add(currentValue.toString());
                currentValue.setLength(0);
                continue;
            }

            currentValue.append(currentChar);
        }

        if (inQuotes) {
            throw new IllegalArgumentException("Linha " + lineNumber + ": aspas CSV não terminadas.");
        }

        columns.add(currentValue.toString());
        return columns;
    }

    private String sanitizeRequiredCsvField(String value, int maxLength, String fieldName, int lineNumber) {
        String sanitized = sanitizeOptionalCsvField(value, maxLength);
        if (sanitized == null) {
            throw new IllegalArgumentException("Linha " + lineNumber + ": campo " + fieldName + " é obrigatório.");
        }
        return sanitized;
    }

    private String sanitizeOptionalCsvField(String value, int maxLength) {
        return InputSanitizer.sanitizeText(stripCsvCell(value), maxLength);
    }

    private String stripCsvCell(String value) {
        if (value == null) {
            return null;
        }
        return value.trim();
    }

    private BigDecimal parseCsvPrice(String value, int lineNumber) {
        String normalizedValue = stripCsvCell(value);
        if (normalizedValue == null || normalizedValue.isBlank()) {
            throw new IllegalArgumentException("Linha " + lineNumber + ": Preco é obrigatório.");
        }

        try {
            return new BigDecimal(normalizedValue.replace(',', '.'));
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("Linha " + lineNumber + ": Preco inválido.");
        }
    }

    private Long parseCsvShelfId(String value, int lineNumber) {
        String normalizedValue = stripCsvCell(value);
        if (normalizedValue == null || normalizedValue.isBlank()) {
            throw new IllegalArgumentException("Linha " + lineNumber + ": IdPrateleira é obrigatório.");
        }

        try {
            Long shelfId = Long.parseLong(normalizedValue);
            if (shelfId <= 0) {
                throw new IllegalArgumentException("Linha " + lineNumber + ": IdPrateleira inválido.");
            }
            return shelfId;
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("Linha " + lineNumber + ": IdPrateleira inválido.");
        }
    }
}
