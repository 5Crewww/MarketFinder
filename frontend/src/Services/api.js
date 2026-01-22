const API_URL = 'http://localhost:8080';

const handleResponse = (response) => {
    return response.text().then(text => {
        const data = text && JSON.parse(text);
        if (!response.ok) {
            const error = (data && data.message) || response.statusText;
            return Promise.reject(error);
        }
        return data;
    });
};

export const apiService = {
    /* ------------------------------------------------------------------
       Controller: /users)
       ------------------------------------------------------------------ */
    login: async (nome, senha) => {
        const response = await fetch(`${API_URL}/user/Login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, senha }), 
        });
        return handleResponse(response);
    },

    getUserByName: (nome) => 
        fetch(`${API_URL}/user/UserGet?nome=${encodeURIComponent(nome)}`)
            .then(handleResponse),

    register: (userData) => 
        fetch(`${API_URL}/user/UserPost`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        }).then(handleResponse),

    getAllUsers: () => 
        fetch(`${API_URL}/user/GetAllUsers`)
            .then(handleResponse),

    deleteUser: (id) => 
        fetch(`${API_URL}/user/UserDelete?id=${id}`, {
            method: 'DELETE',
        }).then(handleResponse),

    /* ------------------------------------------------------------------
       CORREDORES (Controller: /corredores)
       ------------------------------------------------------------------ */
    getCorredores: () => 

        fetch(`${API_URL}/corredores/CGet`)
            .then(handleResponse),
    
    getCorredoresByStore: (storeId) =>
        fetch(`${API_URL}/corredores/CGetByStore/${storeId}`)
            .then(handleResponse),

    createCorredor: (data) => 
        fetch(`${API_URL}/corredores/CPost`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).then(handleResponse),

    deleteCorredor: (id) => 
        fetch(`${API_URL}/corredores/CDel/${id}`, {
            method: 'DELETE',
        }).then(handleResponse),

    /* ------------------------------------------------------------------
       PRATELEIRAS (Controller: /Prateleira)
       ------------------------------------------------------------------ */

    getPrateleiras: (nome = '') => 
        fetch(`${API_URL}/prateleira/PGet${nome ? `?nome=${encodeURIComponent(nome)}` : ''}`)
            .then(handleResponse),

    createPrateleira: (data) => 
        fetch(`${API_URL}/prateleira/PPost`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).then(handleResponse),

    deletePrateleira: (id) => 
        fetch(`${API_URL}/prateleira/PDelete?id=${id}`, {
            method: 'DELETE',
        }).then(handleResponse),

       updatePrateleira: (id, dados) =>
    fetch(`${API_URL}/prateleira/updatePrat/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dados)
    }).then(handleResponse),

    /* ------------------------------------------------------------------
       PRODUTOS (Controller: /Prod)
       ------------------------------------------------------------------ */

    getProducts: (nome = '') => 
        fetch(`${API_URL}/produtos/ProdGet${nome ? `?nome=${encodeURIComponent(nome)}` : ''}`).then(handleResponse),

    createProduct: (data) => {
        const payload = {
            nome: data.nome,
            descricao: data.descricao,
            preco: data.preco,
            idPrateleira: data.shelfId || data.idPrateleira,
            idCorredor: data.aisleId || data.idCorredor
        };

        return fetch(`${API_URL}/produtos/ProdPost`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }).then(handleResponse);
    },

    deleteProduct: (id) => 
        fetch(`${API_URL}/produtos/ProdDelete?id=${id}`, { method: 'DELETE' }).then(handleResponse),
    
    updateProduct: (data) => {
        const payload = {
            id: data.id,
            nome: data.nome,
            descricao: data.descricao,
            preco: data.preco,
            idPrateleira: data.shelfId || data.idPrateleira,
            idCorredor: data.aisleId || data.idCorredor
        };
        return fetch(`${API_URL}/produtos/AlterProd/${data.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }).then(handleResponse);
    }
};