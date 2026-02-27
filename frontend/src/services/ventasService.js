// ventasService.js - Servicio HÍBRIDO para ventas (API + Fallback localStorage)
import { api, endpoints } from './api.js';
import { getCurrentUser } from './authService.js';
import { actualizarInventario } from './productosService.js';

// Cache local para fallback
let ventasCache = [];
let usingAPI = true;

// Inicializar ventas desde localStorage
function initVentas() {
    const stored = localStorage.getItem('ventas');
    if (stored) {
        try {
            ventasCache = JSON.parse(stored);
        } catch (error) {
            ventasCache = [];
        }
    }
}

// Generar folio único
function generarFolio() {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `V-${año}${mes}${dia}-${random}`;
}

// Registrar venta (HÍBRIDO)
export async function registrarVenta(venta) {
    const user = getCurrentUser();
    if (!user) {
        return { success: false, error: 'Usuario no autenticado' };
    }

    if (usingAPI) {
        try {
            console.log('💰 Registrando venta en la API...');
            const ventaData = {
                vendedor_id: user.id,
                total: venta.total,
                subtotal: venta.subtotal,
                impuestos: venta.impuestos || 0,
                descuento: venta.descuento || 0,
                metodo_pago: venta.metodo_pago || 'efectivo',
                cliente_nombre: venta.cliente_nombre || '',
                cliente_telefono: venta.cliente_telefono || '',
                items: venta.items.map(item => ({
                    producto_id: item.productoId,
                    cantidad: item.cantidad,
                    precio_unitario: item.precioUnitario,
                    subtotal: item.subtotal
                }))
            };

            const response = await api.post(endpoints.ventas, ventaData);
            if (response && response.venta) {
                console.log('✅ Venta registrada en la base de datos:', response.venta.folio);
                return { success: true, id: response.venta.id, folio: response.venta.folio, venta: response.venta };
            }
        } catch (error) {
            console.warn('⚠️ API falló, guardando venta en localStorage');
            usingAPI = false;
        }
    }

    // Fallback: localStorage
    if (ventasCache.length === 0) initVentas();

    const newId = Math.max(0, ...ventasCache.map(v => v.id || 0)) + 1;
    const folio = generarFolio();

    const nuevaVenta = {
        id: newId,
        folio,
        vendedor_id: user.id,
        vendedor_nombre: user.nombre,
        fecha: new Date().toISOString(),
        total: venta.total,
        subtotal: venta.subtotal,
        impuestos: venta.impuestos || 0,
        descuento: venta.descuento || 0,
        metodo_pago: venta.metodo_pago || 'efectivo',
        cliente_nombre: venta.cliente_nombre || '',
        cliente_telefono: venta.cliente_telefono || '',
        items: venta.items,
        estado: 'completada'
    };

    // Actualizar inventario
    for (const item of venta.items) {
        await actualizarInventario(item.productoId, -item.cantidad);
    }

    ventasCache.push(nuevaVenta);
    localStorage.setItem('ventas', JSON.stringify(ventasCache));

    console.log('✅ Venta guardada en localStorage:', folio);
    return { success: true, id: newId, folio, venta: nuevaVenta };
}

// Obtener ventas de hoy
export async function obtenerVentasHoy(vendedorId = null) {
    if (usingAPI) {
        try {
            const endpoint = vendedorId
                ? `${endpoints.ventas}?vendedor_id=${vendedorId}&periodo=hoy`
                : `${endpoints.ventas}?periodo=hoy`;

            const response = await api.get(endpoint);
            return response.ventas || [];
        } catch (error) {
            usingAPI = false;
        }
    }

    // Fallback: localStorage
    if (ventasCache.length === 0) initVentas();

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let ventas = ventasCache.filter(v => {
        const fechaVenta = new Date(v.fecha);
        return fechaVenta >= hoy;
    });

    if (vendedorId) {
        ventas = ventas.filter(v => v.vendedor_id === vendedorId);
    }

    ventas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return ventas;
}

// Obtener ventas por rango de fechas
export async function obtenerVentasPorRango(fechaInicio, fechaFin, vendedorId = null) {
    if (usingAPI) {
        try {
            let endpoint = `${endpoints.ventas}?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
            if (vendedorId) endpoint += `&vendedor_id=${vendedorId}`;

            const response = await api.get(endpoint);
            return response.ventas || [];
        } catch (error) {
            usingAPI = false;
        }
    }

    // Fallback: localStorage
    if (ventasCache.length === 0) initVentas();

    const inicio = new Date(fechaInicio);
    inicio.setHours(0, 0, 0, 0);

    const fin = new Date(fechaFin);
    fin.setHours(23, 59, 59, 999);

    let ventas = ventasCache.filter(v => {
        const fechaVenta = new Date(v.fecha);
        return fechaVenta >= inicio && fechaVenta <= fin;
    });

    if (vendedorId) {
        ventas = ventas.filter(v => v.vendedor_id === vendedorId);
    }

    ventas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return ventas;
}

// Obtener todas las ventas
export async function obtenerTodasVentas(limite = 100, vendedorId = null) {
    if (usingAPI) {
        try {
            let endpoint = `${endpoints.ventas}?limite=${limite}`;
            if (vendedorId) endpoint += `&vendedor_id=${vendedorId}`;

            const response = await api.get(endpoint);
            return response.ventas || [];
        } catch (error) {
            usingAPI = false;
        }
    }

    // Fallback: localStorage
    if (ventasCache.length === 0) initVentas();

    let ventas = [...ventasCache];
    if (vendedorId) {
        ventas = ventas.filter(v => v.vendedor_id === vendedorId);
    }

    ventas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return ventas.slice(0, limite);
}

// Obtener estadísticas de ventas
export async function obtenerEstadisticasVentas(fechaInicio, fechaFin, vendedorId = null) {
    const ventas = await obtenerVentasPorRango(fechaInicio, fechaFin, vendedorId);

    const totalVentas = ventas.length;
    const totalIngresos = ventas.reduce((sum, v) => sum + v.total, 0);
    const ticketPromedio = totalVentas > 0 ? totalIngresos / totalVentas : 0;

    const productosVendidos = {};
    ventas.forEach(venta => {
        venta.items?.forEach(item => {
            const key = item.producto_id || item.productoId;
            if (!productosVendidos[key]) {
                productosVendidos[key] = {
                    id: key,
                    nombre: item.nombre || 'Producto',
                    cantidad: 0,
                    ingresos: 0
                };
            }
            productosVendidos[key].cantidad += item.cantidad;
            productosVendidos[key].ingresos += item.subtotal;
        });
    });

    const topProductos = Object.values(productosVendidos)
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 10);

    const ventasPorMetodo = ventas.reduce((acc, v) => {
        const metodo = v.metodo_pago || 'efectivo';
        acc[metodo] = (acc[metodo] || 0) + v.total;
        return acc;
    }, {});

    return {
        totalVentas,
        totalIngresos,
        ticketPromedio,
        topProductos,
        ventasPorMetodo
    };
}

// Cancelar venta
export async function cancelarVenta(ventaId) {
    if (usingAPI) {
        try {
            await api.delete(endpoints.venta(ventaId));
            return { success: true };
        } catch (error) {
            usingAPI = false;
        }
    }

    // Fallback: localStorage
    const index = ventasCache.findIndex(v => v.id === ventaId);
    if (index === -1) {
        return { success: false, error: 'Venta no encontrada' };
    }

    const venta = ventasCache[index];

    // Restaurar inventario
    for (const item of venta.items) {
        await actualizarInventario(item.productoId, item.cantidad);
    }

    ventasCache[index].estado = 'cancelada';
    ventasCache[index].canceladaAt = new Date().toISOString();
    localStorage.setItem('ventas', JSON.stringify(ventasCache));

    return { success: true };
}
