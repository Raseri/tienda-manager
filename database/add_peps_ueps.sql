-- ============================================
-- MIGRACIÓN: Sistema PEPS/UEPS
-- Agregar control de lotes de inventario
-- ============================================

USE tienda_manager;

-- ============================================
-- TABLA: lotes_inventario
-- Registra cada lote de compra de productos
-- ============================================
CREATE TABLE IF NOT EXISTS lotes_inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    cantidad_inicial INT NOT NULL,
    cantidad_restante INT NOT NULL,
    costo_unitario DECIMAL(10, 2) NOT NULL,
    costo_total DECIMAL(10, 2) NOT NULL,
    fecha_entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATE NULL,
    proveedor VARCHAR(150),
    factura_compra VARCHAR(100),
    nota TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_by INT,
    
    INDEX idx_producto (producto_id),
    INDEX idx_fecha (fecha_entrada),
    INDEX idx_activo (activo),
    INDEX idx_restante (cantidad_restante),
    
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- TABLA: detalle_costo_venta
-- Detalla qué lotes se usaron en cada venta
-- ============================================
CREATE TABLE IF NOT EXISTS detalle_costo_venta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    detalle_venta_id INT NOT NULL,
    lote_id INT NOT NULL,
    cantidad INT NOT NULL,
    costo_unitario DECIMAL(10, 2) NOT NULL,
    costo_total DECIMAL(10, 2) NOT NULL,
    
    INDEX idx_detalle_venta (detalle_venta_id),
    INDEX idx_lote (lote_id),
    
    FOREIGN KEY (detalle_venta_id) REFERENCES detalles_venta(id) ON DELETE CASCADE,
    FOREIGN KEY (lote_id) REFERENCES lotes_inventario(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================
-- Agregar campo de método de valuación a productos
-- ============================================
ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS metodo_valuacion ENUM('PEPS', 'UEPS', 'PROMEDIO') DEFAULT 'PEPS'
AFTER activo;

-- ============================================
-- Agregar campo de costo promedio a productos
-- ============================================
ALTER TABLE productos
ADD COLUMN IF NOT EXISTS costo_promedio DECIMAL(10, 2) DEFAULT 0.00
AFTER costo;

-- ============================================
-- VISTA: Resumen de lotes por producto
-- ============================================
CREATE OR REPLACE VIEW resumen_lotes AS
SELECT 
    p.id AS producto_id,
    p.nombre AS producto,
    p.codigo_barras,
    COUNT(l.id) AS total_lotes,
    SUM(l.cantidad_restante) AS unidades_disponibles,
    MIN(l.fecha_entrada) AS lote_mas_antiguo,
    MAX(l.fecha_entrada) AS lote_mas_reciente,
    AVG(l.costo_unitario) AS costo_promedio,
    SUM(l.cantidad_restante * l.costo_unitario) AS valor_inventario
FROM productos p
LEFT JOIN lotes_inventario l ON p.id = l.producto_id AND l.cantidad_restante > 0 AND l.activo = TRUE
GROUP BY p.id, p.nombre, p.codigo_barras;

-- ============================================
-- VISTA: Lotes próximos a vencer
-- ============================================
CREATE OR REPLACE VIEW lotes_proximos_vencer AS
SELECT 
    l.id AS lote_id,
    p.nombre AS producto,
    p.codigo_barras,
    l.cantidad_restante,
    l.fecha_vencimiento,
    DATEDIFF(l.fecha_vencimiento, CURDATE()) AS dias_hasta_vencimiento,
    l.costo_unitario,
    l.proveedor
FROM lotes_inventario l
JOIN productos p ON l.producto_id = p.id
WHERE l.fecha_vencimiento IS NOT NULL 
  AND l.cantidad_restante > 0
  AND l.activo = TRUE
  AND DATEDIFF(l.fecha_vencimiento, CURDATE()) BETWEEN 0 AND 30
ORDER BY dias_hasta_vencimiento ASC;

-- ============================================
-- PROCEDIMIENTO: Registrar entrada de lote
-- ============================================
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS registrar_entrada_lote(
    IN p_producto_id INT,
    IN p_cantidad INT,
    IN p_costo_unitario DECIMAL(10,2),
    IN p_proveedor VARCHAR(150),
    IN p_factura VARCHAR(100),
    IN p_fecha_vencimiento DATE,
    IN p_usuario_id INT,
    OUT p_lote_id INT
)
BEGIN
    DECLARE v_stock_anterior INT;
    DECLARE v_costo_total DECIMAL(10,2);
    
    -- Calcular costo total
    SET v_costo_total = p_cantidad * p_costo_unitario;
    
    -- Obtener stock actual
    SELECT stock INTO v_stock_anterior FROM productos WHERE id = p_producto_id;
    
    -- Insertar nuevo lote
    INSERT INTO lotes_inventario (
        producto_id, cantidad_inicial, cantidad_restante, 
        costo_unitario, costo_total, proveedor, factura_compra,
        fecha_vencimiento, created_by
    ) VALUES (
        p_producto_id, p_cantidad, p_cantidad,
        p_costo_unitario, v_costo_total, p_proveedor, p_factura,
        p_fecha_vencimiento, p_usuario_id
    );
    
    SET p_lote_id = LAST_INSERT_ID();
    
    -- Actualizar stock del producto
    UPDATE productos SET stock = stock + p_cantidad WHERE id = p_producto_id;
    
    -- Registrar en movimientos de inventario
    INSERT INTO movimientos_inventario (
        producto_id, tipo_movimiento, cantidad, 
        stock_anterior, stock_nuevo, referencia, usuario_id
    ) VALUES (
        p_producto_id, 'entrada', p_cantidad,
        v_stock_anterior, v_stock_anterior + p_cantidad,
        CONCAT('LOTE-', p_lote_id), p_usuario_id
    );
    
    -- Actualizar costo promedio
    CALL actualizar_costo_promedio(p_producto_id);
END //
DELIMITER ;

-- ============================================
-- PROCEDIMIENTO: Actualizar costo promedio
-- ============================================
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS actualizar_costo_promedio(
    IN p_producto_id INT
)
BEGIN
    DECLARE v_costo_prom DECIMAL(10,2);
    
    -- Calcular costo promedio ponderado de lotes activos
    SELECT 
        IFNULL(SUM(cantidad_restante * costo_unitario) / NULLIF(SUM(cantidad_restante), 0), 0)
    INTO v_costo_prom
    FROM lotes_inventario
    WHERE producto_id = p_producto_id 
      AND cantidad_restante > 0
      AND activo = TRUE;
    
    -- Actualizar producto
    UPDATE productos 
    SET costo_promedio = v_costo_prom 
    WHERE id = p_producto_id;
END //
DELIMITER ;

-- ============================================
-- PROCEDIMIENTO: Procesar venta con PEPS
-- ============================================
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS procesar_venta_peps(
    IN p_producto_id INT,
    IN p_cantidad INT,
    IN p_detalle_venta_id INT,
    OUT p_costo_total DECIMAL(10,2)
)
BEGIN
    DECLARE v_cantidad_restante INT DEFAULT p_cantidad;
    DECLARE v_lote_id INT;
    DECLARE v_lote_cantidad INT;
    DECLARE v_lote_costo DECIMAL(10,2);
    DECLARE v_cantidad_usar INT;
    DECLARE v_costo_parcial DECIMAL(10,2);
    DECLARE done INT DEFAULT FALSE;
    
    -- Cursor para obtener lotes en orden FIFO (más antiguo primero)
    DECLARE lotes_cursor CURSOR FOR 
        SELECT id, cantidad_restante, costo_unitario
        FROM lotes_inventario
        WHERE producto_id = p_producto_id 
          AND cantidad_restante > 0
          AND activo = TRUE
        ORDER BY fecha_entrada ASC, id ASC;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    SET p_costo_total = 0;
    
    OPEN lotes_cursor;
    
    read_loop: LOOP
        FETCH lotes_cursor INTO v_lote_id, v_lote_cantidad, v_lote_costo;
        
        IF done OR v_cantidad_restante <= 0 THEN
            LEAVE read_loop;
        END IF;
        
        -- Determinar cuánto tomar de este lote
        SET v_cantidad_usar = LEAST(v_cantidad_restante, v_lote_cantidad);
        SET v_costo_parcial = v_cantidad_usar * v_lote_costo;
        
        -- Registrar en detalle de costo
        INSERT INTO detalle_costo_venta (
            detalle_venta_id, lote_id, cantidad, costo_unitario, costo_total
        ) VALUES (
            p_detalle_venta_id, v_lote_id, v_cantidad_usar, v_lote_costo, v_costo_parcial
        );
        
        -- Actualizar lote
        UPDATE lotes_inventario 
        SET cantidad_restante = cantidad_restante - v_cantidad_usar
        WHERE id = v_lote_id;
        
        -- Acumular costo y restar cantidad usada
        SET p_costo_total = p_costo_total + v_costo_parcial;
        SET v_cantidad_restante = v_cantidad_restante - v_cantidad_usar;
    END LOOP;
    
    CLOSE lotes_cursor;
    
    -- Si no hay suficiente inventario
    IF v_cantidad_restante > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No hay suficiente inventario en lotes para procesar la venta';
    END IF;
END //
DELIMITER ;

-- ============================================
-- PROCEDIMIENTO: Procesar venta con UEPS
-- ============================================
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS procesar_venta_ueps(
    IN p_producto_id INT,
    IN p_cantidad INT,
    IN p_detalle_venta_id INT,
    OUT p_costo_total DECIMAL(10,2)
)
BEGIN
    DECLARE v_cantidad_restante INT DEFAULT p_cantidad;
    DECLARE v_lote_id INT;
    DECLARE v_lote_cantidad INT;
    DECLARE v_lote_costo DECIMAL(10,2);
    DECLARE v_cantidad_usar INT;
    DECLARE v_costo_parcial DECIMAL(10,2);
    DECLARE done INT DEFAULT FALSE;
    
    -- Cursor para obtener lotes en orden LIFO (más reciente primero)
    DECLARE lotes_cursor CURSOR FOR 
        SELECT id, cantidad_restante, costo_unitario
        FROM lotes_inventario
        WHERE producto_id = p_producto_id 
          AND cantidad_restante > 0
          AND activo = TRUE
        ORDER BY fecha_entrada DESC, id DESC;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    SET p_costo_total = 0;
    
    OPEN lotes_cursor;
    
    read_loop: LOOP
        FETCH lotes_cursor INTO v_lote_id, v_lote_cantidad, v_lote_costo;
        
        IF done OR v_cantidad_restante <= 0 THEN
            LEAVE read_loop;
        END IF;
        
        -- Determinar cuánto tomar de este lote
        SET v_cantidad_usar = LEAST(v_cantidad_restante, v_lote_cantidad);
        SET v_costo_parcial = v_cantidad_usar * v_lote_costo;
        
        -- Registrar en detalle de costo
        INSERT INTO detalle_costo_venta (
            detalle_venta_id, lote_id, cantidad, costo_unitario, costo_total
        ) VALUES (
            p_detalle_venta_id, v_lote_id, v_cantidad_usar, v_lote_costo, v_costo_parcial
        );
        
        -- Actualizar lote
        UPDATE lotes_inventario 
        SET cantidad_restante = cantidad_restante - v_cantidad_usar
        WHERE id = v_lote_id;
        
        -- Acumular costo y restar cantidad usada
        SET p_costo_total = p_costo_total + v_costo_parcial;
        SET v_cantidad_restante = v_cantidad_restante - v_cantidad_usar;
    END LOOP;
    
    CLOSE lotes_cursor;
    
    -- Si no hay suficiente inventario
    IF v_cantidad_restante > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No hay suficiente inventario en lotes para procesar la venta';
    END IF;
END //
DELIMITER ;

-- ============================================
-- Mensaje de éxito
-- ============================================
SELECT '✅ Sistema PEPS/UEPS instalado exitosamente' AS mensaje;
SELECT 'Nuevas tablas: lotes_inventario, detalle_costo_venta' AS info;
SELECT 'Nuevas vistas: resumen_lotes, lotes_proximos_vencer' AS info2;
SELECT 'Procedimientos: registrar_entrada_lote, procesar_venta_peps, procesar_venta_ueps' AS info3;
