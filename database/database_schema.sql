-- ============================================
-- BASE DE DATOS: TIENDA MANAGER V2
-- Sistema de Gestión para Tiendas de Barrio
-- ============================================

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS tienda_manager
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE tienda_manager;

-- ============================================
-- TABLA: usuarios
-- Almacena información de usuarios del sistema
-- ============================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('admin', 'vendedor') NOT NULL DEFAULT 'vendedor',
    activo BOOLEAN DEFAULT TRUE,
    telefono VARCHAR(20),
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    INDEX idx_email (email),
    INDEX idx_rol (rol),
    INDEX idx_activo (activo)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: productos
-- Almacena el catálogo de productos
-- ============================================
CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_barras VARCHAR(50) UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(100),
    precio DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    costo DECIMAL(10, 2) DEFAULT 0.00,
    stock INT NOT NULL DEFAULT 0,
    stock_minimo INT DEFAULT 5,
    unidad VARCHAR(20) DEFAULT 'pcs',
    proveedor VARCHAR(150),
    imagen_url VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_nombre (nombre),
    INDEX idx_codigo_barras (codigo_barras),
    INDEX idx_categoria (categoria),
    INDEX idx_activo (activo),
    INDEX idx_stock (stock),
    
    FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- TABLA: ventas
-- Almacena encabezado de ventas realizadas
-- ============================================
CREATE TABLE ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    folio VARCHAR(20) UNIQUE NOT NULL,
    vendedor_id INT NOT NULL,
    fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    impuestos DECIMAL(10, 2) DEFAULT 0.00,
    descuento DECIMAL(10, 2) DEFAULT 0.00,
    metodo_pago ENUM('efectivo', 'tarjeta', 'transferencia', 'mixto') DEFAULT 'efectivo',
    estado ENUM('completada', 'cancelada', 'pendiente') DEFAULT 'completada',
    cliente_nombre VARCHAR(150),
    cliente_telefono VARCHAR(20),
    notas TEXT,
    
    INDEX idx_folio (folio),
    INDEX idx_vendedor (vendedor_id),
    INDEX idx_fecha (fecha_venta),
    INDEX idx_estado (estado),
    INDEX idx_metodo_pago (metodo_pago),
    
    FOREIGN KEY (vendedor_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================
-- TABLA: detalles_venta
-- Almacena los productos de cada venta
-- ============================================
CREATE TABLE detalles_venta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venta_id INT NOT NULL,
    producto_id INT NOT NULL,
    producto_nombre VARCHAR(200) NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    descuento DECIMAL(10, 2) DEFAULT 0.00,
    
    INDEX idx_venta (venta_id),
    INDEX idx_producto (producto_id),
    
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================
-- TABLA: movimientos_inventario
-- Registro de entradas y salidas de inventario
-- ============================================
CREATE TABLE movimientos_inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    tipo_movimiento ENUM('entrada', 'salida', 'ajuste', 'venta', 'devolucion') NOT NULL,
    cantidad INT NOT NULL,
    stock_anterior INT NOT NULL,
    stock_nuevo INT NOT NULL,
    referencia VARCHAR(100),
    usuario_id INT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notas TEXT,
    
    INDEX idx_producto (producto_id),
    INDEX idx_tipo (tipo_movimiento),
    INDEX idx_fecha (fecha),
    
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- TABLA: sesiones
-- Control de sesiones activas (opcional)
-- ============================================
CREATE TABLE sesiones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_token (token),
    INDEX idx_usuario (usuario_id),
    INDEX idx_expires (expires_at),
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista: Productos con bajo stock
CREATE VIEW productos_bajo_stock AS
SELECT 
    p.id,
    p.nombre,
    p.codigo_barras,
    p.categoria,
    p.stock,
    p.stock_minimo,
    p.precio
FROM productos p
WHERE p.stock <= p.stock_minimo AND p.activo = TRUE;

-- Vista: Ventas diarias
CREATE VIEW ventas_diarias AS
SELECT 
    DATE(v.fecha_venta) as fecha,
    COUNT(*) as total_ventas,
    SUM(v.total) as total_ingresos,
    AVG(v.total) as ticket_promedio,
    u.nombre as vendedor
FROM ventas v
JOIN usuarios u ON v.vendedor_id = u.id
WHERE v.estado = 'completada'
GROUP BY DATE(v.fecha_venta), v.vendedor_id, u.nombre;

-- Vista: Top productos vendidos
CREATE VIEW top_productos_vendidos AS
SELECT 
    p.id,
    p.nombre,
    p.categoria,
    SUM(dv.cantidad) as total_vendido,
    SUM(dv.subtotal) as ingresos_generados
FROM productos p
JOIN detalles_venta dv ON p.id = dv.producto_id
JOIN ventas v ON dv.venta_id = v.id
WHERE v.estado = 'completada'
GROUP BY p.id, p.nombre, p.categoria
ORDER BY total_vendido DESC;

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Usuario administrador por defecto
-- Password: admin123 (debe ser hasheado en la aplicación)
INSERT INTO usuarios (nombre, email, password_hash, rol, activo) VALUES
('Administrador', 'admin@tienda.com', '$2a$10$placeholder_hash_admin', 'admin', TRUE),
('Vendedor Demo', 'vendedor@tienda.com', '$2a$10$placeholder_hash_vendedor', 'vendedor', TRUE);

-- Categorías de ejemplo como productos iniciales
INSERT INTO productos (codigo_barras, nombre, descripcion, categoria, precio, costo, stock, stock_minimo, unidad) VALUES
('7501234567890', 'Coca-Cola 600ml', 'Refresco de cola', 'Bebidas', 15.00, 10.00, 100, 20, 'pcs'),
('7501234567891', 'Sabritas Original 45g', 'Papas fritas', 'Botanas', 12.00, 8.00, 80, 15, 'pcs'),
('7501234567892', 'Pan Blanco Bimbo', 'Pan de caja blanco', 'Panadería', 35.00, 25.00, 30, 10, 'pcs'),
('7501234567893', 'Leche Lala 1L', 'Leche entera', 'Lácteos', 22.00, 16.00, 50, 15, 'pcs'),
('7501234567894', 'Huevos San Juan 12pz', 'Huevos frescos', 'Huevos', 45.00, 35.00, 25, 10, 'pcs');

-- ============================================
-- PROCEDIMIENTOS ALMACENADOS
-- ============================================

-- Procedimiento: Registrar venta completa
DELIMITER //
CREATE PROCEDURE registrar_venta(
    IN p_vendedor_id INT,
    IN p_total DECIMAL(10,2),
    IN p_subtotal DECIMAL(10,2),
    IN p_metodo_pago VARCHAR(20),
    IN p_cliente_nombre VARCHAR(150),
    OUT p_venta_id INT
)
BEGIN
    DECLARE v_folio VARCHAR(20);
    
    -- Generar folio único
    SET v_folio = CONCAT('V-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(RAND() * 10000), 4, '0'));
    
    -- Insertar venta
    INSERT INTO ventas (folio, vendedor_id, total, subtotal, metodo_pago, cliente_nombre)
    VALUES (v_folio, p_vendedor_id, p_total, p_subtotal, p_metodo_pago, p_cliente_nombre);
    
    SET p_venta_id = LAST_INSERT_ID();
END //
DELIMITER ;

-- Procedimiento: Actualizar stock después de venta
DELIMITER //
CREATE PROCEDURE actualizar_stock_venta(
    IN p_producto_id INT,
    IN p_cantidad INT,
    IN p_venta_id INT
)
BEGIN
    DECLARE v_stock_anterior INT;
    
    -- Obtener stock actual
    SELECT stock INTO v_stock_anterior FROM productos WHERE id = p_producto_id;
    
    -- Actualizar stock
    UPDATE productos SET stock = stock - p_cantidad WHERE id = p_producto_id;
    
    -- Registrar movimiento
    INSERT INTO movimientos_inventario (producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, referencia)
    VALUES (p_producto_id, 'venta', -p_cantidad, v_stock_anterior, v_stock_anterior - p_cantidad, CONCAT('VENTA-', p_venta_id));
END //
DELIMITER ;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Actualizar stock al insertar detalle de venta
DELIMITER //
CREATE TRIGGER after_detalle_venta_insert
AFTER INSERT ON detalles_venta
FOR EACH ROW
BEGIN
    CALL actualizar_stock_venta(NEW.producto_id, NEW.cantidad, NEW.venta_id);
END //
DELIMITER ;

-- ============================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================
/*
1. SEGURIDAD:
   - Los passwords deben hashearse con bcrypt antes de guardar
   - Implementar tokens JWT para autenticación
   - Validar permisos por rol en cada endpoint

2. BACKEND RECOMENDADO:
   - Node.js + Express
   - MySQL2 para conexión a base de datos
   - bcryptjs para hash de passwords
   - jsonwebtoken para JWT

3. CONEXIÓN:
   - Host: localhost
   - Puerto: 3306
   - Usuario: root (o crear usuario específico)
   - Base de datos: tienda_manager

4. ÍNDICES:
   - Los índices están optimizados para búsquedas frecuentes
   - Considerar más índices según patrones de uso

5. RESPALDOS:
   - Programar respaldos automáticos diarios
   - Mantener al menos 7 días de historial
*/
