-- Crear usuario para la aplicación tienda_manager
-- Ejecutar este script en phpMyAdmin (pestaña SQL)

-- Crear usuario con autenticación nativa de MySQL
CREATE USER IF NOT EXISTS 'tienda_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'tienda123';

-- Otorgar todos los privilegios en la base de datos tienda_manager
GRANT ALL PRIVILEGES ON tienda_manager.* TO 'tienda_user'@'localhost';

-- Aplicar cambios
FLUSH PRIVILEGES;

-- Verificar que el usuario fue creado
SELECT User, Host FROM mysql.user WHERE User = 'tienda_user';
