// routes/productos.js - Rutas de productos
import express from 'express';
import db from '../../config/db.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener todos los productos activos
router.get('/', async (req, res) => {
    try {
        const [productos] = await db.query(
            `SELECT id, codigo_barras, nombre, descripcion, categoria, precio, costo, 
                    stock, stock_minimo, unidad, proveedor, imagen_url, activo, created_at, updated_at
             FROM productos 
             WHERE activo = true 
             ORDER BY nombre`
        );

        res.json({ productos });
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// Obtener un producto por ID
router.get('/:id', async (req, res) => {
    try {
        const [productos] = await db.query(
            'SELECT * FROM productos WHERE id = ? AND activo = true',
            [req.params.id]
        );

        if (productos.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json({ producto: productos[0] });
    } catch (error) {
        console.error('Error al obtener producto:', error);
        res.status(500).json({ error: 'Error al obtener producto' });
    }
});

// Buscar producto por código de barras
router.get('/barcode/:codigo', async (req, res) => {
    try {
        const [productos] = await db.query(
            'SELECT * FROM productos WHERE codigo_barras = ? AND activo = true',
            [req.params.codigo]
        );

        if (productos.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json({ producto: productos[0] });
    } catch (error) {
        console.error('Error al buscar producto:', error);
        res.status(500).json({ error: 'Error al buscar producto' });
    }
});

// Crear producto (solo admin)
router.post('/', authorize('admin'), async (req, res) => {
    try {
        const {
            codigo_barras, nombre, descripcion, categoria, precio, costo,
            stock, stock_minimo, unidad, proveedor, imagen_url
        } = req.body;

        if (!nombre || precio === undefined) {
            return res.status(400).json({ error: 'Nombre y precio son requeridos' });
        }

        const [result] = await db.query(
            `INSERT INTO productos 
             (codigo_barras, nombre, descripcion, categoria, precio, costo, stock, stock_minimo, unidad, proveedor, imagen_url, created_by, activo) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)`,
            [codigo_barras, nombre, descripcion, categoria, precio, costo || 0,
                stock || 0, stock_minimo || 5, unidad || 'pcs', proveedor, imagen_url, req.user.id]
        );

        const [newProduct] = await db.query(
            'SELECT * FROM productos WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            message: 'Producto creado exitosamente',
            producto: newProduct[0]
        });
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ error: 'Error al crear producto' });
    }
});

// Actualizar producto (solo admin)
router.put('/:id', authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // No permitir actualizar ciertos campos
        delete updates.id;
        delete updates.created_at;
        delete updates.created_by;

        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updates), id];

        await db.query(
            `UPDATE productos SET ${fields}, updated_at = NOW() WHERE id = ?`,
            values
        );

        const [updated] = await db.query(
            'SELECT * FROM productos WHERE id = ?',
            [id]
        );

        res.json({
            message: 'Producto actualizado exitosamente',
            producto: updated[0]
        });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
});

// Eliminar producto (soft delete, solo admin)
router.delete('/:id', authorize('admin'), async (req, res) => {
    try {
        await db.query(
            'UPDATE productos SET activo = false, updated_at = NOW() WHERE id = ?',
            [req.params.id]
        );

        res.json({ message: 'Producto eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

// Actualizar stock
router.patch('/:id/stock', authorize('admin'), async (req, res) => {
    try {
        const { cantidad } = req.body;

        if (cantidad === undefined) {
            return res.status(400).json({ error: 'Cantidad es requerida' });
        }

        const [result] = await db.query(
            'UPDATE productos SET stock = stock + ?, updated_at = NOW() WHERE id = ?',
            [cantidad, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const [updated] = await db.query(
            'SELECT * FROM productos WHERE id = ?',
            [req.params.id]
        );

        res.json({
            message: 'Stock actualizado',
            producto: updated[0]
        });
    } catch (error) {
        console.error('Error al actualizar stock:', error);
        res.status(500).json({ error: 'Error al actualizar stock' });
    }
});

export default router;
