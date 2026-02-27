// routes/reportes.js - Rutas de reportes y estadísticas
import express from 'express';
import db from '../../config/db.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Estadísticas generales (admin ve todo, vendedor solo sus datos)
router.get('/estadisticas', async (req, res) => {
    try {
        const { desde, hasta } = req.query;

        let whereClause = '';
        const params = [];

        // Filtrar por fechas si se proporcionan
        if (desde && hasta) {
            whereClause = 'WHERE DATE(fecha_venta) BETWEEN ? AND ?';
            params.push(desde, hasta);

            if (req.user.rol === 'vendedor') {
                whereClause += ' AND vendedor_id = ?';
                params.push(req.user.id);
            }
        } else if (req.user.rol === 'vendedor') {
            whereClause = 'WHERE vendedor_id = ?';
            params.push(req.user.id);
        }

        // Total de ventas
        const [totalVentas] = await db.query(
            `SELECT COUNT(*) as total, SUM(total) as ingresos, AVG(total) as promedio
             FROM ventas ${whereClause} AND estado = 'completada'`,
            params
        );

        // Ventas por método de pago
        const [porMetodo] = await db.query(
            `SELECT metodo_pago, COUNT(*) as cantidad, SUM(total) as total
             FROM ventas ${whereClause} AND estado = 'completada'
             GROUP BY metodo_pago`,
            params
        );

        // Productos más vendidos
        const [topProductos] = await db.query(
            `SELECT dv.producto_nombre, SUM(dv.cantidad) as cantidad_vendida, SUM(dv.subtotal) as ingresos
             FROM detalles_venta dv
             INNER JOIN ventas v ON dv.venta_id = v.id
             ${whereClause} AND v.estado = 'completada'
             GROUP BY dv.producto_id, dv.producto_nombre
             ORDER BY cantidad_vendida DESC
             LIMIT 10`,
            params
        );

        res.json({
            totalVentas: totalVentas[0].total || 0,
            ingresosTotales: totalVentas[0].ingresos || 0,
            ticketPromedio: totalVentas[0].promedio || 0,
            ventasPorMetodo: porMetodo,
            topProductos
        });

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

// Ventas por período (diario, semanal, mensual)
router.get('/ventas-periodo', async (req, res) => {
    try {
        const { periodo = 'diario', dias = 7 } = req.query;

        let groupBy, dateFormat;

        switch (periodo) {
            case 'mensual':
                groupBy = 'DATE_FORMAT(fecha_venta, \'%Y-%m\')';
                dateFormat = '%Y-%m';
                break;
            case 'semanal':
                groupBy = 'YEARWEEK(fecha_venta, 1)';
                dateFormat = 'Semana %v-%Y';
                break;
            default: // diario
                groupBy = 'DATE(fecha_venta)';
                dateFormat = '%Y-%m-%d';
        }

        let query = `
            SELECT 
                ${groupBy} as periodo,
                COUNT(*) as total_ventas,
                SUM(total) as ingresos
            FROM ventas
            WHERE DATE(fecha_venta) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            AND estado = 'completada'
        `;

        const params = [parseInt(dias)];

        if (req.user.rol === 'vendedor') {
            query += ' AND vendedor_id = ?';
            params.push(req.user.id);
        }

        query += ` GROUP BY ${groupBy} ORDER BY periodo DESC`;

        const [ventas] = await db.query(query, params);

        res.json({ ventas });

    } catch (error) {
        console.error('Error al obtener ventas por período:', error);
        res.status(500).json({ error: 'Error al obtener ventas por período' });
    }
});

// Estadísticas de inventario (solo admin)
router.get('/inventario', authorize('admin'), async (req, res) => {
    try {
        // Total de productos
        const [totales] = await db.query(
            `SELECT 
                COUNT(*) as total_productos,
                SUM(stock) as total_stock,
                SUM(stock * precio) as valor_inventario,
                SUM(stock * costo) as costo_inventario
             FROM productos 
             WHERE activo = true`
        );

        // Productos con bajo stock
        const [bajoStock] = await db.query(
            `SELECT id, nombre, stock, stock_minimo, categoria
             FROM productos
             WHERE activo = true AND stock <= stock_minimo
             ORDER BY stock ASC`
        );

        // Productos por categoría
        const [porCategoria] = await db.query(
            `SELECT categoria, COUNT(*) as cantidad, SUM(stock) as stock_total
             FROM productos
             WHERE activo = true
             GROUP BY categoria
             ORDER BY cantidad DESC`
        );

        res.json({
            totales: totales[0],
            productosBajoStock: bajoStock,
            productosPorCategoria: porCategoria
        });

    } catch (error) {
        console.error('Error al obtener estadísticas de inventario:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas de inventario' });
    }
});

// Comparativa de vendedores (solo admin)
router.get('/vendedores', authorize('admin'), async (req, res) => {
    try {
        const { desde, hasta } = req.query;

        let whereClause = '';
        const params = [];

        if (desde && hasta) {
            whereClause = 'WHERE DATE(v.fecha_venta) BETWEEN ? AND ?';
            params.push(desde, hasta);
        }

        const [vendedores] = await db.query(
            `SELECT 
                u.id,
                u.nombre,
                COUNT(v.id) as total_ventas,
                SUM(v.total) as ingresos_totales,
                AVG(v.total) as ticket_promedio,
                MAX(v.fecha_venta) as ultima_venta
             FROM usuarios u
             LEFT JOIN ventas v ON u.id = v.vendedor_id ${whereClause ? 'AND ' + whereClause.replace('WHERE ', '') : ''}
             WHERE u.rol = 'vendedor' AND u.activo = true
             GROUP BY u.id, u.nombre
             ORDER BY ingresos_totales DESC`,
            params
        );

        res.json({ vendedores });

    } catch (error) {
        console.error('Error al obtener comparativa de vendedores:', error);
        res.status(500).json({ error: 'Error al obtener comparativa de vendedores' });
    }
});

// Dashboard resumen
router.get('/dashboard', async (req, res) => {
    try {
        const params = req.user.rol === 'vendedor' ? [req.user.id] : [];
        const vendedorClause = req.user.rol === 'vendedor' ? 'WHERE vendedor_id = ?' : '';

        // Ventas de hoy
        const [hoy] = await db.query(
            `SELECT COUNT(*) as total, SUM(total) as ingresos
             FROM ventas
             WHERE DATE(fecha_venta) = CURDATE() 
             ${vendedorClause}
             AND estado = 'completada'`,
            params
        );

        // Ventas de la semana
        const [semana] = await db.query(
            `SELECT COUNT(*) as total, SUM(total) as ingresos
             FROM ventas
             WHERE YEARWEEK(fecha_venta, 1) = YEARWEEK(CURDATE(), 1)
             ${vendedorClause}
             AND estado = 'completada'`,
            params
        );

        // Ventas del mes
        const [mes] = await db.query(
            `SELECT COUNT(*) as total, SUM(total) as ingresos
             FROM ventas
             WHERE YEAR(fecha_venta) = YEAR(CURDATE()) 
             AND MONTH(fecha_venta) = MONTH(CURDATE())
             ${vendedorClause}
             AND estado = 'completada'`,
            params
        );

        let inventario = null;
        if (req.user.rol === 'admin') {
            const [inv] = await db.query(
                `SELECT 
                    COUNT(*) as total_productos,
                    SUM(stock * precio) as valor_inventario,
                    COUNT(CASE WHEN stock <= stock_minimo THEN 1 END) as productos_bajo_stock
                 FROM productos
                 WHERE activo = true`
            );
            inventario = inv[0];
        }

        res.json({
            hoy: hoy[0],
            semana: semana[0],
            mes: mes[0],
            inventario
        });

    } catch (error) {
        console.error('Error al obtener dashboard:', error);
        res.status(500).json({ error: 'Error al obtener dashboard' });
    }
});

export default router;
