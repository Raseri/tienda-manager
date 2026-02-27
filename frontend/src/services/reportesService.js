// reportesService.js - Servicio para análisis y estadísticas (sin Firebase)
import { obtenerVentasHoy, obtenerVentasPorRango, obtenerTodasVentas } from './ventasService.js';
import { obtenerProductosActivos } from './productosService.js';
import { isAdmin, getCurrentUser } from './authService.js';

// Obtener estadísticas del día
export async function obtenerEstadisticasDia() {
    try {
        const user = getCurrentUser();
        const vendedorId = isAdmin() ? null : user?.id;

        const ventas = await obtenerVentasHoy(vendedorId);

        const totalVentas = ventas.length;
        const totalIngresos = ventas.reduce((sum, venta) => sum + (venta.total || 0), 0);
        const promedioVenta = totalVentas > 0 ? totalIngresos / totalVentas : 0;

        // Contar productos vendidos
        const productosVendidos = {};
        ventas.forEach(venta => {
            venta.items?.forEach(item => {
                if (productosVendidos[item.nombre]) {
                    productosVendidos[item.nombre] += item.cantidad;
                } else {
                    productosVendidos[item.nombre] = item.cantidad;
                }
            });
        });

        return {
            totalVentas,
            totalIngresos,
            promedioVenta,
            productosVendidos
        };
    } catch (error) {
        console.error('❌ Error al obtener estadísticas del día:', error);
        return {
            totalVentas: 0,
            totalIngresos: 0,
            promedioVenta: 0,
            productosVendidos: {}
        };
    }
}

// Obtener productos más vendidos
export async function obtenerProductosMasVendidos(limite = 5) {
    try {
        const user = getCurrentUser();
        const vendedorId = isAdmin() ? null : user?.id;

        // Obtener ventas de los últimos 30 días
        const fechaFin = new Date();
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - 30);

        const ventas = await obtenerVentasPorRango(fechaInicio, fechaFin, vendedorId);

        // Contar productos
        const conteo = {};
        ventas.forEach(venta => {
            venta.items?.forEach(item => {
                const key = item.productoId;
                if (conteo[key]) {
                    conteo[key].cantidad += item.cantidad;
                    conteo[key].ingresos += item.subtotal || 0;
                } else {
                    conteo[key] = {
                        nombre: item.nombre,
                        cantidad: item.cantidad,
                        ingresos: item.subtotal || 0,
                        productoId: item.productoId
                    };
                }
            });
        });

        // Convertir a array y ordenar
        const productos = Object.values(conteo);
        productos.sort((a, b) => b.cantidad - a.cantidad);

        return productos.slice(0, limite);
    } catch (error) {
        console.error('❌ Error al obtener productos más vendidos:', error);
        return [];
    }
}

// Obtener datos para gráfica de ventas semanales
export async function obtenerVentasSemanales() {
    try {
        const user = getCurrentUser();
        const vendedorId = isAdmin() ? null : user?.id;

        const fechaFin = new Date();
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - 7);

        const ventas = await obtenerVentasPorRango(fechaInicio, fechaFin, vendedorId);

        // Agrupar por día
        const ventasPorDia = {};
        const dias = [];

        // Inicializar últimos 7 días
        for (let i = 6; i >= 0; i--) {
            const fecha = new Date();
            fecha.setDate(fecha.getDate() - i);
            const key = fecha.toISOString().split('T')[0];
            dias.push(key);
            ventasPorDia[key] = 0;
        }

        // Sumar ventas por día
        ventas.forEach(venta => {
            if (venta.fecha) {
                // venta.fecha es un string ISO
                const key = venta.fecha.split('T')[0];
                if (ventasPorDia[key] !== undefined) {
                    ventasPorDia[key] += venta.total || 0;
                }
            }
        });

        return {
            labels: dias.map(dia => {
                const fecha = new Date(dia);
                return fecha.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
            }),
            datos: dias.map(dia => ventasPorDia[dia])
        };
    } catch (error) {
        console.error('❌ Error al obtener ventas semanales:', error);
        return {
            labels: [],
            datos: []
        };
    }
}

// Obtener ventas mensuales
export async function obtenerVentasMensuales() {
    try {
        const user = getCurrentUser();
        const vendedorId = isAdmin() ? null : user?.id;

        const fechaFin = new Date();
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - 30);

        const ventas = await obtenerVentasPorRango(fechaInicio, fechaFin, vendedorId);

        // Agrupar por semana
        const ventasPorSemana = {};
        const semanas = [];

        // Inicializar 4 semanas
        for (let i = 3; i >= 0; i--) {
            const inicio = new Date();
            inicio.setDate(inicio.getDate() - (i * 7 + 6));
            const fin = new Date();
            fin.setDate(fin.getDate() - (i * 7));

            const key = `Semana ${4 - i}`;
            semanas.push(key);
            ventasPorSemana[key] = 0;
        }

        // Sumar ventas (simplificado, asignar a la semana correspondiente)
        const now = new Date();
        ventas.forEach(venta => {
            const fechaVenta = new Date(venta.fecha);
            const diffDays = Math.floor((now - fechaVenta) / (1000 * 60 * 60 * 24));
            const semanaIdx = Math.min(Math.floor(diffDays / 7), 3);
            const key = `Semana ${4 - semanaIdx}`;

            if (ventasPorSemana[key] !== undefined) {
                ventasPorSemana[key] += venta.total || 0;
            }
        });

        return {
            labels: semanas,
            datos: semanas.map(s => ventasPorSemana[s])
        };
    } catch (error) {
        console.error('❌ Error al obtener ventas mensuales:', error);
        return {
            labels: [],
            datos: []
        };
    }
}

// Obtener estadísticas de inventario
export async function obtenerEstadisticasInventario() {
    try {
        const productos = await obtenerProductosActivos();

        const totalProductos = productos.length;
        const valorInventario = productos.reduce((sum, p) => sum + (p.precio * p.stock), 0);
        const productosBajoStock = productos.filter(p => p.stock <= p.stock_minimo);

        // Productos por categoría
        const porCategoria = {};
        productos.forEach(p => {
            const cat = p.categoria || 'Sin categoría';
            porCategoria[cat] = (porCategoria[cat] || 0) + 1;
        });

        return {
            totalProductos,
            valorInventario,
            productosBajoStock: productosBajoStock.length,
            productosBajoStockDetalle: productosBajoStock,
            porCategoria
        };
    } catch (error) {
        console.error('❌ Error al obtener estadísticas de inventario:', error);
        return {
            totalProductos: 0,
            valorInventario: 0,
            productosBajoStock: 0,
            productosBajoStockDetalle: [],
            porCategoria: {}
        };
    }
}

// Obtener comparativa de vendedores (solo admin)
export async function obtenerComparativaVendedores() {
    try {
        if (!isAdmin()) {
            throw new Error('Acceso denegado');
        }

        const fechaFin = new Date();
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - 30);

        const ventas = await obtenerVentasPorRango(fechaInicio, fechaFin);

        // Agrupar por vendedor
        const porVendedor = {};
        ventas.forEach(venta => {
            const vendedorId = venta.vendedor_id;
            const vendedorNombre = venta.vendedor_nombre || 'Sin nombre';

            if (!porVendedor[vendedorId]) {
                porVendedor[vendedorId] = {
                    nombre: vendedorNombre,
                    totalVentas: 0,
                    totalIngresos: 0,
                    cantidadVentas: 0
                };
            }

            porVendedor[vendedorId].cantidadVentas += 1;
            porVendedor[vendedorId].totalIngresos += venta.total || 0;
        });

        // Convertir a array y calcular promedios
        const vendedores = Object.values(porVendedor).map(v => ({
            ...v,
            ticketPromedio: v.cantidadVentas > 0 ? v.totalIngresos / v.cantidadVentas : 0
        }));

        // Ordenar por ingresos
        vendedores.sort((a, b) => b.totalIngresos - a.totalIngresos);

        return vendedores;
    } catch (error) {
        console.error('❌ Error al obtener comparativa de vendedores:', error);
        return [];
    }
}

// Obtener resumen general
export async function obtenerResumenGeneral() {
    try {
        const [estadisticasDia, productosMasVendidos, ventasSemanales, inventario] = await Promise.all([
            obtenerEstadisticasDia(),
            obtenerProductosMasVendidos(5),
            obtenerVentasSemanales(),
            obtenerEstadisticasInventario()
        ]);

        return {
            hoy: estadisticasDia,
            topProductos: productosMasVendidos,
            semana: ventasSemanales,
            inventario
        };
    } catch (error) {
        console.error('❌ Error al obtener resumen general:', error);
        return null;
    }
}
