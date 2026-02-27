// services/lotesService.js - Servicios de gestión de lotes
import db from '../db.js';

/**
 * Procesar venta usando el método de valuación configurado para el producto
 * @param {Object} connection - Conexión MySQL para transacción
 * @param {number} productoId - ID del producto
 * @param {number} cantidad - Cantidad vendida
 * @param {number} detalleVentaId - ID del detalle de venta
 * @returns {Promise<number>} Costo total de la venta
 */
export async function procesarVentaConLotes(connection, productoId, cantidad, detalleVentaId) {
    try {
        // Obtener método de valuación del producto
        const [producto] = await connection.query(
            'SELECT metodo_valuacion FROM productos WHERE id = ?',
            [productoId]
        );

        if (producto.length === 0) {
            throw new Error('Producto no encontrado');
        }

        const metodo = producto[0].metodo_valuacion || 'PEPS';

        // Llamar al procedimiento correspondiente
        const procedimiento = metodo === 'UEPS' ? 'procesar_venta_ueps' : 'procesar_venta_peps';

        await connection.query(
            `CALL ${procedimiento}(?, ?, ?, @costo_total)`,
            [productoId, cantidad, detalleVentaId]
        );

        // Obtener el costo calculado
        const [[{ '@costo_total': costoTotal }]] = await connection.query('SELECT @costo_total');

        return parseFloat(costoTotal) || 0;

    } catch (error) {
        console.error('Error al procesar venta con lotes:', error);
        throw error;
    }
}

/**
 * Verificar que hay suficiente stock en lotes para una venta
 * @param {Object} connection - Conexión MySQL
 * @param {number} productoId - ID del producto
 * @param {number} cantidadRequerida - Cantidad que se quiere vender
 * @returns {Promise<boolean>} True si hay suficiente stock
 */
export async function verificarStockEnLotes(connection, productoId, cantidadRequerida) {
    try {
        const [result] = await connection.query(
            `SELECT COALESCE(SUM(cantidad_restante), 0) AS stock_total
             FROM lotes_inventario
             WHERE producto_id = ? AND cantidad_restante > 0 AND activo = TRUE`,
            [productoId]
        );

        return result[0].stock_total >= cantidadRequerida;
    } catch (error) {
        console.error('Error al verificar stock en lotes:', error);
        throw error;
    }
}

/**
 * Registrar cancelación de venta y restaurar lotes
 * @param {Object} connection - Conexión MySQL
 * @param {number} ventaId - ID de la venta a cancelar
 */
export async function restaurarLotesDeVenta(connection, ventaId) {
    try {
        // Obtener todos los detalles de costo
        const [costos] = await connection.query(
            `SELECT dcv.* 
             FROM detalle_costo_venta dcv
             JOIN detalles_venta dv ON dcv.detalle_venta_id = dv.id
             WHERE dv.venta_id = ?`,
            [ventaId]
        );

        // Restaurar cada lote
        for (const costo of costos) {
            await connection.query(
                `UPDATE lotes_inventario 
                 SET cantidad_restante = cantidad_restante + ?
                 WHERE id = ?`,
                [costo.cantidad, costo.lote_id]
            );
        }

        return true;
    } catch (error) {
        console.error('Error al restaurar lotes:', error);
        throw error;
    }
}

/**
 * Calcular el valor total del inventario usando todos los métodos
 * @param {number|null} productoId - ID del producto (null para todos)
 * @returns {Promise<Object>} Valores calculados por PEPS, UEPS y Promedio
 */
export async function calcularValuacionInventario(productoId = null) {
    try {
        let query = `
            SELECT 
                p.id,
                p.nombre,
                p.codigo_barras,
                SUM(l.cantidad_restante) AS unidades_totales,
                -- Costo por PEPS (primeros lotes)
                (SELECT SUM(cantidad_restante * costo_unitario) 
                 FROM lotes_inventario 
                 WHERE producto_id = p.id AND cantidad_restante > 0 AND  activo = TRUE) AS valor_peps,
                -- Costo por UEPS (últimos lotes)
                (SELECT SUM(cantidad_restante * costo_unitario) 
                 FROM lotes_inventario 
                 WHERE producto_id = p.id AND cantidad_restante > 0 AND activo = TRUE) AS valor_ueps,
                -- Costo promedio ponderado
                AVG(l.costo_unitario) AS costo_promedio,
                SUM(l.cantidad_restante * l.costo_unitario) AS valor_total
            FROM productos p
            LEFT JOIN lotes_inventario l ON p.id = l.producto_id 
                AND l.cantidad_restante > 0 
                AND l.activo = TRUE
            WHERE 1=1
        `;

        const params = [];

        if (productoId) {
            query += ' AND p.id = ?';
            params.push(productoId);
        }

        query += ' GROUP BY p.id, p.nombre, p.codigo_barras';

        const [resultados] = await db.query(query, params);

        return resultados;
    } catch (error) {
        console.error('Error al calcular valuación:', error);
        throw error;
    }
}

/**
 * Obtener el costo de ventas (CMV) para un período
 * @param {string} fechaInicio - Fecha de inicio (YYYY-MM-DD)
 * @param {string} fechaFin - Fecha de fin (YYYY-MM-DD)
 * @returns {Promise<number>} Costo total de mercancía vendida
 */
export async function calcularCostoMercanciaVendida(fechaInicio, fechaFin) {
    try {
        const [result] = await db.query(
            `SELECT COALESCE(SUM(dcv.costo_total), 0) AS cmv
             FROM detalle_costo_venta dcv
             JOIN detalles_venta dv ON dcv.detalle_venta_id = dv.id
             JOIN ventas v ON dv.venta_id = v.id
             WHERE v.fecha_venta BETWEEN ? AND ?
               AND v.estado != 'cancelada'`,
            [fechaInicio, fechaFin]
        );

        return parseFloat(result[0].cmv) || 0;
    } catch (error) {
        console.error('Error al calcular CMV:', error);
        throw error;
    }
}

export default {
    procesarVentaConLotes,
    verificarStockEnLotes,
    restaurarLotesDeVenta,
    calcularValuacionInventario,
    calcularCostoMercanciaVendida
};
