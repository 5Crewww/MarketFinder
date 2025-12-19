const API_URL = 'http://localhost:8080';

// Função auxiliar para processar as respostas
const handleResponse = async (response) => {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Erro: ${response.status}`);
    }
    // Tenta fazer parse do JSON. Se não houver conteúdo (ex: 204 No Content), retorna null
    try {
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    } catch (e) {
        return null;
    }
};

export const apiService = {
    /* ------------------------------------------------------------------
       USUÁRIOS (Controller: /users)
       Nota: O backend usa @RequestMapping("/users") e não "/User"
       ------------------------------------------------------------------ */
    login: async (nome, senha) => {
        const response = await fetch(`${API_URL}/User/Login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, senha }), 
        });
        // Se der erro 401 (senha errada), o handleResponse lança o erro
        return handleResponse(response);
    },
    // Login: O UserController atual não tem endpoint /Login. 
    // Usamos GetByName para simular (como no auth.js) ou ajusta se criares o endpoint.
    getUserByName: (nome) => 
        fetch(`${API_URL}/User/UserGet?nome=${encodeURIComponent(nome)}`)
            .then(handleResponse),

    register: (userData) => 
        fetch(`${API_URL}/User/UserPost`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        }).then(handleResponse),

    getAllUsers: () => 
        fetch(`${API_URL}/User/GetAllUsers`) 
            .then(handleResponse),

    // Backend: @DeleteMapping("/UserDel/{id}") -> Usa PathVariable, não ?id=
    deleteUser: (id) => 
        fetch(`${API_URL}/User/UserDel/${id}`, {
            method: 'DELETE',
        }).then(handleResponse),

    /* ------------------------------------------------------------------
       CORREDORES (Controller: /corredores)
       Nota: O backend usa @RequestMapping("/corredores")
       ------------------------------------------------------------------ */
    getCorredores: () => 
        // Podes usar CGet (por nome) ou criar um endpoint CGetAll se necessário
        // Aqui mantemos o CGet se for pesquisa, ou ajusta para listar todos
        fetch(`${API_URL}/corredores/CGet`) 
            .then(handleResponse),
    
    // Buscar corredores por Loja (Útil para listar todos de uma loja)
    getCorredoresByStore: (storeId) =>
        fetch(`${API_URL}/corredores/CGetByStore/${storeId}`)
            .then(handleResponse),

    createCorredor: (data) => 
        fetch(`${API_URL}/corredores/CPost`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).then(handleResponse),

    // Backend: @DeleteMapping("/CDel/{id}") -> Usa PathVariable
    deleteCorredor: (id) => 
        fetch(`${API_URL}/corredores/CDel/${id}`, {
            method: 'DELETE',
        }).then(handleResponse),

    /* ------------------------------------------------------------------
       PRATELEIRAS (Controller: /Prateleira)
       Nota: Atualizado para o novo Controller que fizemos
       ------------------------------------------------------------------ */
    getPrateleiras: (nome = '') => 
        // Backend: @GetMapping("/PGet") com @RequestParam opcional
        fetch(`${API_URL}/Prateleira/PGet${nome ? `?nome=${encodeURIComponent(nome)}` : ''}`)
            .then(handleResponse),

    createPrateleira: (data) => 
        fetch(`${API_URL}/Prateleira/PPost`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).then(handleResponse),

    // Backend: @DeleteMapping("/PDelete") com @RequestParam -> Usa ?id=
    deletePrateleira: (id) => 
        fetch(`${API_URL}/Prateleira/PDelete?id=${id}`, {
            method: 'DELETE',
        }).then(handleResponse),

    /* ------------------------------------------------------------------
       PRODUTOS (Controller: /Prod)
       ------------------------------------------------------------------ */

    getProducts: (nome = '') => 
        fetch(`${API_URL}/Prod/ProdGet${nome ? `?nome=${encodeURIComponent(nome)}` : ''}`).then(handleResponse),

    createProduct: (data) => {
        // --- TRADUÇÃO DE CAMPOS ---
        // O Frontend envia 'shelfId', mas o Java (ProdutosRequest) espera 'idPrateleira'
        const payload = {
            nome: data.nome,
            descricao: data.descricao,
            preco: data.preco,
            // Mapeamento Crucial:
            idPrateleira: data.shelfId || data.idPrateleira,
            idCorredor: data.aisleId || data.idCorredor
        };

        return fetch(`${API_URL}/Prod/ProdPost`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }).then(handleResponse);
    },

    deleteProduct: (id) => 
        fetch(`${API_URL}/Prod/ProdDelete?id=${id}`, { method: 'DELETE' }).then(handleResponse),
    
    // Suporte para update se necessário
    updateProduct: (data) => {
        const payload = {
            id: data.id,
            nome: data.nome,
            descricao: data.descricao,
            preco: data.preco,
            idPrateleira: data.shelfId || data.idPrateleira,
            idCorredor: data.aisleId || data.idCorredor
        };
        return fetch(`${API_URL}/Prod/AlterProd/${data.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }).then(handleResponse);
    }
};