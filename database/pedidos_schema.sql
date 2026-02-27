-- ============================================================
-- PEDIDOS SCHEMA — Módulo de Logística (Tienda Manager V2)
-- Ejecutar en MySQL Workbench / phpMyAdmin / consola MySQL
-- ============================================================

USE tienda_manager;

-- 1. Añadir rol repartidor a la tabla usuarios
ALTER TABLE usuarios
  MODIFY rol ENUM('admin','vendedor','repartidor') NOT NULL DEFAULT 'vendedor';

-- 2. Insertar usuario demo repartidor (solo si no existe)
INSERT IGNORE INTO usuarios (nombre, email, password_hash, rol, activo, telefono)
VALUES ('Repartidor Demo', 'repartidor@tienda.com', '$2a$10$demo_hash_repartidor', 'repartidor', TRUE, '555-0003');

-- 3. Tabla principal de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  folio           VARCHAR(20) UNIQUE NOT NULL,
  cliente_nombre  VARCHAR(150) NOT NULL,
  cliente_telefono VARCHAR(20),
  cliente_direccion TEXT NOT NULL,
  cliente_lat     DECIMAL(10,7) NOT NULL DEFAULT 19.0413000,
  cliente_lng     DECIMAL(10,7) NOT NULL DEFAULT -98.2062000,
  estado          ENUM('pendiente','en_camino','entregado','cancelado') DEFAULT 'pendiente',
  metodo_pago     ENUM('efectivo','tarjeta','transferencia') DEFAULT 'efectivo',
  total           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  notas           TEXT,
  repartidor_id   INT,
  creado_por      INT NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_estado      (estado),
  INDEX idx_repartidor  (repartidor_id),
  INDEX idx_creado_por  (creado_por),
  INDEX idx_fecha       (created_at),
  
  FOREIGN KEY (repartidor_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (creado_por)    REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 4. Detalle de productos por pedido
CREATE TABLE IF NOT EXISTS detalle_pedido (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id       INT NOT NULL,
  producto_id     INT NOT NULL,
  producto_nombre VARCHAR(200) NOT NULL,
  cantidad        INT NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal        DECIMAL(10,2) NOT NULL,
  
  INDEX idx_pedido   (pedido_id),
  INDEX idx_producto (producto_id),
  
  FOREIGN KEY (pedido_id)   REFERENCES pedidos(id)   ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)  ON DELETE RESTRICT
) ENGINE=InnoDB;
