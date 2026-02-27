

-- Eliminar usuarios demo si existen
DELETE FROM usuarios WHERE email IN ('admin@tienda.com', 'vendedor@tienda.com');

-- Insertar usuario administrador
-- Password: admin123 (hasheado con bcrypt)
INSERT INTO usuarios (nombre, email, password_hash, rol, telefono, activo, created_at, last_login) 
VALUES (
    'Administrador',
    'admin@tienda.com',
    '$2a$10$YQ7qZ4k6rYvKJ7VlXZNY0eXKJZV8rH5jNjYQZ9XvLqKHXwZqYJ7.G',
    'admin',
    '555-0001',
    true,
    NOW(),
    NOW()
);

-- Capturar el ID del admin recién creado
SET @admin_id = LAST_INSERT_ID();

-- Insertar usuario vendedor
-- Password: vendedor123 (hasheado con bcrypt)
INSERT INTO usuarios (nombre, email, password_hash, rol, telefono, activo, created_at, last_login) 
VALUES (
    'Juan Vendedor',
    'vendedor@tienda.com',
    '$2a$10$3iYqZ5kJ7VvKJ8WmXZNY1eXKJZV8rH6jNjYQZ9XvLqKHXwZqYJ8.H',
    'vendedor',
    '555-0002',
    true,
    NOW(),
    NOW()
);

-- Eliminar productos demo si existen (opcional)
DELETE FROM productos WHERE codigo_barras IN (
    '7501234567890', '7501234567891', '7501234567892', '7501234567893', '7501234567894',
    '7501234567895', '7501234567896', '7501234567897', '7501234567898', '7501234567899'
);

-- Insertar productos usando el ID del admin capturado
INSERT INTO productos (codigo_barras, nombre, descripcion, categoria, precio, costo, stock, stock_minimo, unidad, proveedor, activo, created_by) 
VALUES
    ('7501234567890', 'Coca-Cola 600ml', 'Refresco de cola 600ml', 'Bebidas', 15.00, 10.00, 100, 20, 'pza', 'Coca-Cola FEMSA', true, @admin_id),
    ('7501234567891', 'Sabritas Original 45g', 'Papas fritas sabor original', 'Botanas', 12.00, 8.00, 80, 15, 'pza', 'PepsiCo', true, @admin_id),
    ('7501234567892', 'Bimbo Blanco Grande', 'Pan de caja blanco grande', 'Panadería', 35.00, 25.00, 50, 10, 'pza', 'Grupo Bimbo', true, @admin_id),
    ('7501234567893', 'Leche Lala 1L', 'Leche entera 1 litro', 'Lácteos', 22.00, 18.00, 60, 12, 'pza', 'Grupo Lala', true, @admin_id),
    ('7501234567894', 'Huevo San Juan 12pz', 'Huevo blanco 12 piezas', 'Abarrotes', 45.00, 35.00, 40, 8, 'pza', 'Bachoco', true, @admin_id),
    ('7501234567895', 'Tortillas 1kg', 'Tortillas de maíz', 'Tortillería', 20.00, 15.00, 30, 5, 'kg', 'La Tortillería', true, @admin_id),
    ('7501234567896', 'Agua Ciel 1.5L', 'Agua purificada', 'Bebidas', 10.00, 7.00, 120, 25, 'pza', 'Coca-Cola', true, @admin_id),
    ('7501234567897', 'Jabón Roma', 'Jabón de tocador', 'Higiene', 8.00, 5.00, 90, 15, 'pza', 'Henkel', true, @admin_id),
    ('7501234567898', 'Galletas Marías', 'Galletas marías 340g', 'Galletas', 18.00, 12.00, 70, 10, 'pza', 'Gamesa', true, @admin_id),
    ('7501234567899', 'Aceite 123 900ml', 'Aceite vegetal', 'Abarrotes', 35.00, 28.00, 45, 8, 'pza', 'Patrona', true, @admin_id);

SELECT '✅ Usuarios y productos demo creados exitosamente' as Resultado;
SELECT COUNT(*) as TotalUsuarios FROM usuarios;
SELECT COUNT(*) as TotalProductos FROM productos;
