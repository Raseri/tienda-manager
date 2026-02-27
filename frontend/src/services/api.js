// api.js - Base API service para comunicación con backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Helper para hacer requests
async function request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    // Obtener token de autenticación
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');

    // Configuración por defecto
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    // Agregar token si existe
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, config);

        // Verificar si es 401 (no autorizado) para hacer logout
        if (response.status === 401) {
            // Limpiar sesión y recargar
            sessionStorage.clear();
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
            window.location.reload();
            throw new Error('Sesión expirada');
        }

        // Parse response
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error en la petición');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Métodos HTTP
export const api = {
    // GET
    get: (endpoint, options = {}) => {
        return request(endpoint, {
            method: 'GET',
            ...options,
        });
    },

    // POST
    post: (endpoint, data, options = {}) => {
        return request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
            ...options,
        });
    },

    // PUT
    put: (endpoint, data, options = {}) => {
        return request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
            ...options,
        });
    },

    // PATCH
    patch: (endpoint, data, options = {}) => {
        return request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data),
            ...options,
        });
    },

    // DELETE
    delete: (endpoint, options = {}) => {
        return request(endpoint, {
            method: 'DELETE',
            ...options,
        });
    },
};

// Endpoints específicos
export const endpoints = {
    // Auth
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    me: '/auth/me',

    // Productos
    productos: '/productos',
    producto: (id) => `/productos/${id}`,

    // Ventas
    ventas: '/ventas',
    venta: (id) => `/ventas/${id}`,
    ventasVendedor: (vendedorId) => `/ventas/vendedor/${vendedorId}`,

    // Reportes
    reportes: '/reportes',
    reporteVentas: '/reportes/ventas',
    reporteProductos: '/reportes/productos',
    reporteVendedores: '/reportes/vendedores',

    // Usuarios (admin only)
    usuarios: '/usuarios',
    usuario: (id) => `/usuarios/${id}`,
};

export default api;
