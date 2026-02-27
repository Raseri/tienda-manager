// routes/ventas.js - Rutas de ventas
import express from 'express';
import db from '../../config/db.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener todas las ventas (admin ve todas, vendedor solo las suyas)
router.get('/', async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;

        let query = `
            SELECT v.*, u.nombre as vendedor_nombre
            FROM ventas v
            LEFT JOIN usuarios u ON v.vendedor_id = u.id
        `;

        const params = [];

        // Si es vendedor, solo sus ventas
        if (req.user.rol === 'vendedor') {
            query += ' WHERE v.vendedor_id = ?';
            params.push(req.user.id);
        }

        query += ' ORDER BY v.fecha_venta DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [ventas] = await db.query(query, params);

        // Obtener detalles para cada venta
        for (let venta of ventas) {
            const [detalles] = await db.query(
                'SELECT * FROM detalles_venta WHERE venta_id = ?',
                [venta.id]
            );
            venta.items = detalles;
        }

        res.json({ ventas });
    } catch (error) {
        console.error('Error al obtener ventas:', error);
        res.status(500).json({ error: 'Error al obtener ventas' });
    }
});

// Obtener ventas de hoy
router.get('/hoy', async (req, res) => {
    try {
        let query = `
            SELECT v.*, u.nombre as vendedor_nombre
            FROM ventas v
            LEFT JOIN usuarios u ON v.vendedor_id = u.id
            WHERE DATE(v.fecha_venta) = CURDATE()
        `;

        const params = [];

        if (req.user.rol === 'vendedor') {
            query += ' AND v.vendedor_id = ?';
            params.push(req.user.id);
        }

        query += ' ORDER BY v.fecha_venta DESC';

        const [ventas] = await db.query(query, params);

        for (let venta of ventas) {
            const [detalles] = await db.query(
                'SELECT * FROM detalles_venta WHERE venta_id = ?',
                [venta.id]
            );
            venta.items = detalles;
        }

        res.json({ ventas });
    } catch (error) {
        console.error('Error al obtener ventas de hoy:', error);
        res.status(500).json({ error: 'Error al obtener ventas de hoy' });
    }
});

// Registrar nueva venta
router.post('/', async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { total, subtotal, impuestos = 0, descuento = 0, metodo_pago = 'efectivo',
            cliente_nombre, cliente_telefono, items, notas, usar_lotes = true } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Debe incluir al menos un producto' });
        }

        await connection.beginTransaction();

        // Generar folio
        const fecha = new Date();
        const folio = `V-${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

        // Insertar venta
        const [ventaResult] = await connection.query(
            `INSERT INTO ventas 
             (folio, vendedor_id, total, subtotal, impuestos, descuento, metodo_pago, cliente_nombre, cliente_telefono, notas, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completada')`,
            [folio, req.user.id, total, subtotal, impuestos, descuento, metodo_pago,
                cliente_nombre, cliente_telefono, notas]
        );

        const ventaId = ventaResult.insertId;
        let costoTotalVenta = 0;

        // Insertar detalles y procesar lotes
        for (const item of items) {
            // Insertar detalle de venta
            const [detalleResult] = await connection.query(
                `INSERT INTO detalles_venta 
                 (venta_id, producto_id, producto_nombre, cantidad, precio_unitario, subtotal, descuento) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [ventaId, item.productoId, item.nombre, item.cantidad,
                    item.precio, item.subtotal, item.descuento || 0]
            );

            const detalleVentaId = detalleResult.insertId;

            // Procesar con lotes si está habilitado
            if (usar_lotes) {
                try {
                    // Obtener método de valuación del producto
                    const [producto] = await connection.query(
                        'SELECT metodo_valuacion FROM productos WHERE id = ?',
                        [item.productoId]
                    );

                    const metodo = producto[0]?.metodo_valuacion || 'PEPS';
                    const procedimiento = metodo === 'UEPS' ? 'procesar_venta_ueps' : 'procesar_venta_peps';

                    // Llamar al procedimiento almacenado
                    await connection.query(
                        `CALL ${procedimiento}(?, ?, ?, @costo_total)`,
                        [item.productoId, item.cantidad, detalleVentaId]
                    );

                    // Obtener el costo calculado
                    const [[{ '@costo_total': costoItem }]] = await connection.query('SELECT @costo_total');
                    costoTotalVenta += parseFloat(costoItem) || 0;

                } catch (lotesError) {
                    // Si falla el procesamiento con lotes, hacer fallback a actualización simple
                    console.error('Error procesando lotes, usando método simple:', lotesError);
                    await connection.query(
                        'UPDATE productos SET stock = stock - ? WHERE id = ?',
                        [item.cantidad, item.productoId]
                    );
                }
            } else {
                // Actualizar stock del producto (método tradicional)
                await connection.query(
                    'UPDATE productos SET stock = stock - ? WHERE id = ?',
                    [item.cantidad, item.productoId]
                );
            }

            // Verificar que el stock no quede negativo
            const [productoCheck] = await connection.query(
                'SELECT stock FROM productos WHERE id = ?',
                [item.productoId]
            );

            if (productoCheck[0].stock < 0) {
                throw new Error(`Stock insuficiente para ${item.nombre}`);
            }
        }

        await connection.commit();

        // Obtener venta completa
        const [venta] = await connection.query(
            'SELECT * FROM ventas WHERE id = ?',
            [ventaId]
        );

        const [detalles] = await connection.query(
            'SELECT * FROM detalles_venta WHERE venta_id = ?',
            [ventaId]
        );

        res.status(201).json({
            message: 'Venta registrada exitosamente',
            venta: {
                ...venta[0],
                items: detalles,
                costo_total: costoTotalVenta
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error al registrar venta:', error);
        res.status(500).json({ error: error.message || 'Error al registrar venta' });
    } finally {
        connection.release();
    }
});

// Obtener una venta por ID
router.get('/:id', async (req, res) => {
    try {
        const [ventas] = await db.query(
            'SELECT * FROM ventas WHERE id = ?',
            [req.params.id]
        );

        if (ventas.length === 0) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }

        const venta = ventas[0];

        // Verificar permisos
        if (req.user.rol === 'vendedor' && venta.vendedor_id !== req.user.id) {
            return res.status(403).json({ error: 'No tienes permiso para ver esta venta' });
        }

        const [detalles] = await db.query(
            'SELECT * FROM detalles_venta WHERE venta_id = ?',
            [req.params.id]
        );

        res.json({
            venta: {
                ...venta,
                items: detalles
            }
        });
    } catch (error) {
        console.error('Error al obtener venta:', error);
        res.status(500).json({ error: 'Error al obtener venta' });
    }
});

// Cancelar venta (solo admin)
router.patch('/:id/cancelar', authorize('admin'), async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Obtener venta y detalles
        const [ventas] = await connection.query(
            'SELECT * FROM ventas WHERE id = ?',
            [req.params.id]
        );

        if (ventas.length === 0) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }

        const [detalles] = await connection.query(
            'SELECT * FROM detalles_venta WHERE venta_id = ?',
            [req.params.id]
        );

        // Restaurar stock
        for (const detalle of detalles) {
            await connection.query(
                'UPDATE productos SET stock = stock + ? WHERE id = ?',
                [detalle.cantidad, detalle.producto_id]
            );
        }

        // Marcar venta como cancelada
        await connection.query(
            'UPDATE ventas SET estado = \'cancelada\' WHERE id = ?',
            [req.params.id]
        );

        await connection.commit();

        res.json({ message: 'Venta cancelada exitosamente' });

    } catch (error) {
        await connection.rollback();
        console.error('Error al cancelar venta:', error);
        res.status(500).json({ error: 'Error al cancelar venta' });
    } finally {
        connection.release();
    }
});

export default router;
