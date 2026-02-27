// productosService.js - Servicio HÍBRIDO de productos (API + Fallback localStorage)
import { api, endpoints } from './api.js';

// Cache local para fallback
let productosCache = [];
let listeners = [];
let usingAPI = true; // Flag para saber si estamos usando API

// Inicializar productos demo para fallback
function initDemoProducts() {
    const demoProducts = [
        { id: 1, codigo_barras: '7501234567890', nombre: 'Coca-Cola 600ml', descripcion: 'Refresco de cola', categoria: 'Bebidas', precio: 15.00, costo: 10.00, stock: 100, stock_minimo: 20, unidad: 'pza', activo: true },
        { id: 2, codigo_barras: '7501234567891', nombre: 'Sabritas Original 45g', descripcion: 'Papas fritas', categoria: 'Botanas', precio: 12.00, costo: 8.00, stock: 80, stock_minimo: 15, unidad: 'pza', activo: true },
        { id: 3, codigo_barras: '7501234567892', nombre: 'Pan Blanco Bimbo', descripcion: 'Pan de caja blanco', categoria: 'Panadería', precio: 35.00, costo: 25.00, stock: 30, stock_minimo: 10, unidad: 'pza', activo: true },
        { id: 4, codigo_barras: '7501234567893', nombre: 'Leche Lala 1L', descripcion: 'Leche entera', categoria: 'Lácteos', precio: 22.00, costo: 16.00, stock: 50, stock_minimo: 15, unidad: 'pza', activo: true },
        { id: 5, codigo_barras: '7501234567894', nombre: 'Huevos San Juan 12pz', descripcion: 'Huevos frescos', categoria: 'Huevos', precio: 45.00, costo: 35.00, stock: 25, stock_minimo: 10, unidad: 'pza', activo: true },
    ];

    const stored = localStorage.getItem('productos');
    if (stored) {
        try {
            productosCache = JSON.parse(stored);
        } catch (error) {
            productosCache = demoProducts;
            localStorage.setItem('productos', JSON.stringify(productosCache));
        }
    } else {
        productosCache = demoProducts;
        localStorage.setItem('productos', JSON.stringify(productosCache));
    }
}

// Obtener productos (HÍBRIDO)
export function obtenerProductos(callback) {
    // Intentar API primero
    fetchProductosAPI().then(productos => {
        if (productos && productos.length >= 0) {
            usingAPI = true;
            console.log('✅ Productos cargados desde API');
            callback(productos);
            listeners.push(callback);
        } else {
            throw new Error('API failed');
        }
    }).catch(() => {
        // Fallback a localStorage
        console.warn('⚠️ API no disponible, usando modo DEMO para productos');
        usingAPI = false;
        if (productosCache.length === 0) initDemoProducts();
        callback([...productosCache.filter(p => p.activo)]);
        listeners.push(callback);
    });

    return () => {
        const index = listeners.indexOf(callback);
        if (index > -1) listeners.splice(index, 1);
    };
}

async function fetchProductosAPI() {
    try {
        const response = await api.get(endpoints.productos);
        return response.productos || [];
    } catch (error) {
        throw error;
    }
}

// Agregar producto (HÍBRIDO)
export async function agregarProducto(producto) {
    if (usingAPI) {
        try {
            console.log('➕ Agregando producto a la API...');
            const response = await api.post(endpoints.productos, producto);
            if (response && response.producto) {
                await notifyListeners();
                console.log('✅ Producto guardado en la base de datos');
                return { success: true, id: response.producto.id, producto: response.producto };
            }
        } catch (error) {
            console.warn('⚠️ API falló, guardando en localStorage');
            usingAPI = false;
        }
    }

    // Fallback: localStorage
    if (productosCache.length === 0) initDemoProducts();
    const newId = Math.max(0, ...productosCache.map(p => p.id)) + 1;
    const newProduct = { ...producto, id: newId, activo: true, createdAt: new Date().toISOString() };
    productosCache.push(newProduct);
    localStorage.setItem('productos', JSON.stringify(productosCache));
    notifyListenersLocal();
    console.log('✅ Producto guardado en localStorage');
    return { success: true, id: newId, producto: newProduct };
}

// Actualizar producto (HÍBRIDO)
export async function actualizarProducto(id, cambios) {
    if (usingAPI) {
        try {
            const response = await api.put(endpoints.producto(id), cambios);
            if (response && response.producto) {
                await notifyListeners();
                return { success: true };
            }
        } catch (error) {
            console.warn('⚠️ API falló, actualizando en localStorage');
            usingAPI = false;
        }
    }

    // Fallback: localStorage
    const index = productosCache.findIndex(p => p.id === id);
    if (index !== -1) {
        productosCache[index] = { ...productosCache[index], ...cambios };
        localStorage.setItem('productos', JSON.stringify(productosCache));
        notifyListenersLocal();
        return { success: true };
    }
    return { success: false, error: 'Producto no encontrado' };
}

// Eliminar producto (HÍBRIDO)
export async function eliminarProducto(id) {
    if (usingAPI) {
        try {
            await api.delete(endpoints.producto(id));
            await notifyListeners();
            return { success: true };
        } catch (error) {
            console.warn('⚠️ API falló, eliminando de localStorage');
            usingAPI = false;
        }
    }

    // Fallback: localStorage
    const index = productosCache.findIndex(p => p.id === id);
    if (index !== -1) {
        productosCache[index].activo = false;
        localStorage.setItem('productos', JSON.stringify(productosCache));
        notifyListenersLocal();
        return { success: true };
    }
    return { success: false, error: 'Producto no encontrado' };
}

// Actualizar inventario (HÍBRIDO)
export async function actualizarInventario(id, cantidad) {
    if (usingAPI) {
        try {
            const response = await api.patch(endpoints.producto(id) + '/stock', { cantidad });
            if (response && response.producto) {
                await notifyListeners();
                return { success: true, newStock: response.producto.stock };
            }
        } catch (error) {
            console.warn('⚠️ API falló, actualizando stock en localStorage');
            usingAPI = false;
        }
    }

    // Fallback: localStorage
    const index = productosCache.findIndex(p => p.id === id);
    if (index !== -1) {
        const newStock = productosCache[index].stock + cantidad;
        if (newStock < 0) return { success: false, error: 'Stock insuficiente' };
        productosCache[index].stock = newStock;
        localStorage.setItem('productos', JSON.stringify(productosCache));
        notifyListenersLocal();
        return { success: true, newStock };
    }
    return { success: false, error: 'Producto no encontrado' };
}

// Obtener productos activos
export async function obtenerProductosActivos() {
    if (usingAPI) {
        try {
            return await fetchProductosAPI();
        } catch (error) {
            usingAPI = false;
        }
    }
    if (productosCache.length === 0) initDemoProducts();
    return productosCache.filter(p => p.activo);
}

// Buscar por código de barras
export async function buscarPorCodigoBarras(codigoBarras) {
    if (usingAPI) {
        try {
            const response = await api.get(`/productos/barcode/${codigoBarras}`);
            if (response && response.producto) return response.producto;
        } catch (error) {
            usingAPI = false;
        }
    }
    if (productosCache.length === 0) initDemoProducts();
    return productosCache.find(p => p.activo && p.codigo_barras === codigoBarras) || null;
}

async function notifyListeners() {
    try {
        const productos = await fetchProductosAPI();
        listeners.forEach(callback => {
            try { callback(productos); } catch (e) { }
        });
    } catch (error) { }
}

function notifyListenersLocal() {
    listeners.forEach(callback => {
        try { callback([...productosCache.filter(p => p.activo)]); } catch (e) { }
    });
}

export function cleanupProductosService() {
    listeners = [];
}
