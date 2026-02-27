
========== COPIA ESTE SQL EN MYSQL WORKBENCH ==========


DELETE FROM usuarios WHERE email IN ('admin@tienda.com', 'vendedor@tienda.com');

INSERT INTO usuarios (nombre, email, password_hash, rol, telefono, activo, created_at, last_login) VALUES
('Administrador', 'admin@tienda.com', '$2a$10$m5XZZAaVUFn5TlnC3nq2G.jDchQ2w3rhPF7wVzFHqaJtq0x9kunGS', 'admin', '555-0001', 1, NOW(), NOW()),
('Juan Vendedor', 'vendedor@tienda.com', '$2a$10$.P2Et9MjJmt5oNQoC3sRS.1O27SFxuDT6xWYbntTiKUn/i83ZzbNC', 'vendedor', '555-0002', 1, NOW(), NOW());

SELECT * FROM usuarios;

=======================================================

