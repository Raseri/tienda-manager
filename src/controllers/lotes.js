// routes/lotes.js - Rutas para gestión de lotes de inventario
import express from 'express';
import db from '../../config/db.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// ============================================
// Listar todos los lotes
// ============================================
router.get('/', async (req, res) => {
    try {
        const { producto_id, activo } = req.query;

        let query = `
            SELECT 
                l.*,
                p.nombre AS producto_nombre,
                p.codigo_barras,
                p.unidad,
                u.nombre AS creado_por
            FROM lotes_inventario l
            JOIN productos p ON l.producto_id = p.id
            LEFT JOIN usuarios u ON l.created_by = u.id
            WHERE 1=1
        `;

        const params = [];

        if (producto_id) {
            query += ' AND l.producto_id = ?';
            params.push(producto_id);
        }

        if (activo !== undefined) {
            query += ' AND l.activo = ?';
            params.push(activo === 'true' ? 1 : 0);
        }

        query += ' ORDER BY l.fecha_entrada DESC';

        const [lotes] = await db.query(query, params);

        res.json({
            success: true,
            data: lotes
        });
    } catch (error) {
        console.error('Error al obtener lotes:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener lotes'
        });
    }
});

// ============================================
// Obtener resumen de lotes por producto
// ============================================
router.get('/resumen', async (req, res) => {
    try {
        const [resumen] = await db.query(`
            SELECT * FROM resumen_lotes
            ORDER BY producto
        `);

        res.json({
            success: true,
            data: resumen
        });
    } catch (error) {
        console.error('Error al obtener resumen:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener resumen de lotes'
        });
    }
});

// ============================================
// Obtener lotes próximos a vencer
// ============================================
router.get('/proximos-vencer', async (req, res) => {
    try {
        const [lotes] = await db.query(`
            SELECT * FROM lotes_proximos_vencer
            ORDER BY dias_hasta_vencimiento ASC
            LIMIT 50
        `);

        res.json({
            success: true,
            data: lotes
        });
    } catch (error) {
        console.error('Error al obtener lotes próximos a vencer:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener lotes próximos a vencer'
        });
    }
});

// ============================================
// Obtener lotes de un producto específico
// ============================================
router.get('/producto/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [lotes] = await db.query(`
            SELECT 
                l.*,
                DATEDIFF(l.fecha_vencimiento, CURDATE()) AS dias_hasta_vencimiento
            FROM lotes_inventario l
            WHERE l.producto_id = ?
              AND l.cantidad_restante > 0
              AND l.activo = TRUE
            ORDER BY l.fecha_entrada ASC
        `, [id]);

        res.json({
            success: true,
            data: lotes
        });
    } catch (error) {
        console.error('Error al obtener lotes del producto:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener lotes del producto'
        });
    }
});

// ============================================
// Registrar nuevo lote (entrada de inventario)
// ============================================
router.post('/', authorize('admin'), async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const {
            producto_id,
            cantidad,
            costo_unitario,
            proveedor,
            factura_compra,
            fecha_vencimiento,
            nota
        } = req.body;

        // Validaciones
        if (!producto_id || !cantidad || !costo_unitario) {
            return res.status(400).json({
                success: false,
                error: 'Faltan campos requeridos'
            });
        }

        if (cantidad <= 0 || costo_unitario <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Cantidad y costo deben ser mayores a 0'
            });
        }

        // Verificar que el producto existe
        const [producto] = await connection.query(
            'SELECT id, stock FROM productos WHERE id = ?',
            [producto_id]
        );

        if (producto.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                error: 'Producto no encontrado'
            });
        }

        // Llamar al procedimiento almacenado
        const [result] = await connection.query(
            'CALL registrar_entrada_lote(?, ?, ?, ?, ?, ?, ?, @lote_id)',
            [
                producto_id,
                cantidad,
                costo_unitario,
                proveedor || null,
                factura_compra || null,
                fecha_vencimiento || null,
                req.user.userId
            ]
        );

        // Obtener el ID del lote creado
        const [[{ '@lote_id': loteId }]] = await connection.query('SELECT @lote_id');

        // Si hay nota, actualizarla
        if (nota) {
            await connection.query(
                'UPDATE lotes_inventario SET nota = ? WHERE id = ?',
                [nota, loteId]
            );
        }

        await connection.commit();

        // Obtener el lote completo para devolverlo
        const [lote] = await connection.query(
            'SELECT * FROM lotes_inventario WHERE id = ?',
            [loteId]
        );

        res.status(201).json({
            success: true,
            message: 'Lote registrado exitosamente',
            data: lote[0]
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error al registrar lote:', error);
        res.status(500).json({
            success: false,
            error: 'Error al registrar lote',
            details: error.message
        });
    } finally {
        connection.release();
    }
});

// ============================================
// Actualizar lote (solo para admin)
// ============================================
router.put('/:id', authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { proveedor, factura_compra, nota, activo } = req.body;

        const updates = [];
        const params = [];

        if (proveedor !== undefined) {
            updates.push('proveedor = ?');
            params.push(proveedor);
        }

        if (factura_compra !== undefined) {
            updates.push('factura_compra = ?');
            params.push(factura_compra);
        }

        if (nota !== undefined) {
            updates.push('nota = ?');
            params.push(nota);
        }

        if (activo !== undefined) {
            updates.push('activo = ?');
            params.push(activo ? 1 : 0);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No hay campos para actualizar'
            });
        }

        params.push(id);

        const [result] = await db.query(
            `UPDATE lotes_inventario SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Lote no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Lote actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar lote:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar lote'
        });
    }
});

// ============================================
// Desactivar lote (soft delete)
// ============================================
router.delete('/:id', authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            'UPDATE lotes_inventario SET activo = FALSE WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Lote no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Lote desactivado exitosamente'
        });
    } catch (error) {
        console.error('Error al desactivar lote:', error);
        res.status(500).json({
            success: false,
            error: 'Error al desactivar lote'
        });
    }
});

// ============================================
// Obtener detalles de costo de una venta
// ============================================
router.get('/costos-venta/:ventaId', async (req, res) => {
    try {
        const { ventaId } = req.params;

        const [costos] = await db.query(`
            SELECT 
                dcv.*,
                dv.producto_id,
                p.nombre AS producto_nombre,
                l.fecha_entrada AS fecha_entrada_lote,
                l.proveedor
            FROM detalle_costo_venta dcv
            JOIN detalles_venta dv ON dcv.detalle_venta_id = dv.id
            JOIN productos p ON dv.producto_id = p.id
            JOIN lotes_inventario l ON dcv.lote_id = l.id
            WHERE dv.venta_id = ?
            ORDER BY dv.id, dcv.id
        `, [ventaId]);

        res.json({
            success: true,
            data: costos
        });
    } catch (error) {
        console.error('Error al obtener costos de venta:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener detalles de costo'
        });
    }
});

export default router;
