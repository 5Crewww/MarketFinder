const API_URL = 'http://localhost:8080';
const PRODUCTS_API_URL = `${API_URL}/produtos`;

const getSessionToken = () => {
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) {
        return null;
    }

    try {
        return JSON.parse(savedUser)?.sessionToken || null;
    } catch (error) {
        return null;
    }
};

const withAuthHeaders = (headers = {}) => {
    const sessionToken = getSessionToken();
    return sessionToken
        ? { ...headers, 'X-Session-Token': sessionToken }
        : headers;
};

const handleResponse = (response) => {
    return response.text().then((text) => {
        let data = null;

        if (text) {
            try {
                data = JSON.parse(text);
            } catch (error) {
                data = text;
            }
        }

        if (!response.ok) {
            const details = Array.isArray(data?.details) && data.details.length > 0
                ? ` ${data.details.join(' ')}`
                : '';
            const error = data?.message
                ? `${data.message}${details}`
                : data || response.statusText;
            return Promise.reject(error);
        }

        return data;
    });
};

const toQueryString = (params = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
            return;
        }
        search.set(key, value);
    });

    const query = search.toString();
    return query ? `?${query}` : '';
};

const parseIntegerField = (value) => {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const normalizedValue = typeof value === 'string' ? value.trim() : value;
    if (normalizedValue === '') {
        return null;
    }

    const parsedValue = Number.parseInt(normalizedValue, 10);
    return Number.isInteger(parsedValue) ? parsedValue : null;
};

const parseDecimalField = (value) => {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const normalizedValue = typeof value === 'string'
        ? value.trim().replace(',', '.')
        : value;

    if (normalizedValue === '') {
        return null;
    }

    const parsedValue = typeof normalizedValue === 'number'
        ? normalizedValue
        : Number.parseFloat(normalizedValue);

    if (!Number.isFinite(parsedValue)) {
        return null;
    }

    return Number(parsedValue.toFixed(2));
};

const buildProductPayload = (data) => {
    return {
        productId: parseIntegerField(data.productId),
        nome: typeof data.nome === 'string' ? data.nome.trim() : data.nome,
        descricao: typeof data.descricao === 'string' ? data.descricao.trim() : data.descricao,
        categoria: typeof data.categoria === 'string' ? data.categoria.trim() : data.categoria,
        preco: parseDecimalField(data.preco),
        stock: parseIntegerField(data.stock),
        idPrateleira: parseIntegerField(data.shelfId ?? data.idPrateleira),
        storeId: parseIntegerField(data.storeId),
        version: parseIntegerField(data.version),
    };
};

const validateCreateProductPayload = (payload) => {
    if (!payload.storeId) {
        throw new Error('A loja do produto e obrigatoria.');
    }

    if (!payload.idPrateleira) {
        throw new Error('A prateleira do produto e obrigatoria.');
    }

    if (!payload.productId && (!payload.nome || !payload.nome.trim())) {
        throw new Error('O nome do produto e obrigatorio.');
    }

    return payload;
};

export const apiService = {
    login: async (identificador, senha) => {
        const response = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: (identificador ?? '').trim(),
                senha,
            }),
        });
        return handleResponse(response);
    },

    logout: () =>
        fetch(`${API_URL}/users/logout`, {
            method: 'POST',
            headers: withAuthHeaders(),
        }).then(handleResponse),

    getUserByName: (nome) =>
        fetch(`${API_URL}/users/by-name?nome=${encodeURIComponent(nome)}`, {
            headers: withAuthHeaders(),
        }).then(handleResponse),

    register: (userData) =>
        fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(userData),
        }).then(handleResponse),

    getAllUsers: () =>
        fetch(`${API_URL}/users`, {
            headers: withAuthHeaders(),
        }).then(handleResponse),

    deleteUser: (id) =>
        fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: withAuthHeaders(),
        }).then(handleResponse),

    getStores: () =>
        fetch(`${API_URL}/stores`, {
            headers: withAuthHeaders(),
        }).then(handleResponse),

    getPublicStores: () =>
        fetch(`${API_URL}/stores/public`).then(handleResponse),

    getStore: (id) =>
        fetch(`${API_URL}/stores/${id}`, {
            headers: withAuthHeaders(),
        }).then(handleResponse),

    getPublicStore: (id) =>
        fetch(`${API_URL}/stores/public/${id}`).then(handleResponse),

    updateStoreLayout: (id, layoutImageUrl, version) =>
        fetch(`${API_URL}/stores/${id}/layout`, {
            method: 'PUT',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ layoutImageUrl, version }),
        }).then(handleResponse),

    getCorredores: (params = {}) =>
        fetch(`${API_URL}/corredores${toQueryString(params)}`, {
            headers: withAuthHeaders(),
        }).then(handleResponse),

    getCorredoresByStore: (storeId) =>
        fetch(`${API_URL}/corredores/store/${storeId}`, {
            headers: withAuthHeaders(),
        }).then(handleResponse),

    createCorredor: (data) =>
        fetch(`${API_URL}/corredores`, {
            method: 'POST',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        }).then(handleResponse),

    deleteCorredor: (id, storeId) =>
        fetch(`${API_URL}/corredores/${id}${toQueryString({ storeId })}`, {
            method: 'DELETE',
            headers: withAuthHeaders(),
        }).then(handleResponse),

    getPrateleiras: (params = {}) =>
        fetch(`${API_URL}/prateleiras${toQueryString(params)}`, {
            headers: withAuthHeaders(),
        }).then(handleResponse),

    createPrateleira: (data) =>
        fetch(`${API_URL}/prateleiras`, {
            method: 'POST',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        }).then(handleResponse),

    deletePrateleira: (id, storeId) =>
        fetch(`${API_URL}/prateleiras/${id}${toQueryString({ storeId })}`, {
            method: 'DELETE',
            headers: withAuthHeaders(),
        }).then(handleResponse),

    updatePrateleira: (id, dados) =>
        fetch(`${API_URL}/prateleiras/${id}`, {
            method: 'PUT',
            headers: withAuthHeaders({
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify(dados),
        }).then(handleResponse),

    getProducts: (params = {}) => {
        const requestParams = typeof params === 'string' ? { nome: params } : params;
        return fetch(`${PRODUCTS_API_URL}${toQueryString(requestParams)}`, {
            headers: withAuthHeaders(),
        }).then(handleResponse);
    },

    getPublicProducts: (params = {}) => {
        const requestParams = typeof params === 'string' ? { nome: params } : params;
        return fetch(`${PRODUCTS_API_URL}/public${toQueryString(requestParams)}`).then(handleResponse);
    },

    getProductCategories: (storeId) =>
        fetch(`${PRODUCTS_API_URL}/categorias${toQueryString({ storeId })}`, {
            headers: withAuthHeaders(),
        }).then(handleResponse),

    getPublicProductCategories: (storeId) =>
        fetch(`${PRODUCTS_API_URL}/public/categorias${toQueryString({ storeId })}`).then(handleResponse),

    createProduct: (data) => {
        const payload = validateCreateProductPayload(buildProductPayload(data));

        return fetch(PRODUCTS_API_URL, {
            method: 'POST',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload),
        }).then(handleResponse);
    },

    deleteProduct: (id, storeId) =>
        fetch(`${PRODUCTS_API_URL}/${id}${toQueryString({ storeId })}`, {
            method: 'DELETE',
            headers: withAuthHeaders(),
        }).then(handleResponse),

    updateProduct: (id, data) => {
        const payload = {
            ...buildProductPayload(data),
            id: parseIntegerField(id),
        };
        return fetch(`${PRODUCTS_API_URL}/${id}`, {
            method: 'PUT',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload),
        }).then(handleResponse);
    },

    moveProductsBatch: (data) =>
        fetch(`${PRODUCTS_API_URL}/batch/move`, {
            method: 'PUT',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        }).then(handleResponse),

    updateCorredor: (id, data) =>
        fetch(`${API_URL}/corredores/${id}`, {
            method: 'PUT',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        }).then(handleResponse),
};
