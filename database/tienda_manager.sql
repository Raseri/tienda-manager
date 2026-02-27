-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 07-02-2026 a las 19:55:03
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `tienda_manager`
--

DELIMITER $$
--
-- Procedimientos
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `actualizar_stock_venta` (IN `p_producto_id` INT, IN `p_cantidad` INT, IN `p_venta_id` INT)   BEGIN
    DECLARE v_stock_anterior INT;
    

    SELECT stock INTO v_stock_anterior FROM productos WHERE id = p_producto_id;
    

    UPDATE productos SET stock = stock - p_cantidad WHERE id = p_producto_id;
    
  
    INSERT INTO movimientos_inventario (producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, referencia)
    VALUES (p_producto_id, 'venta', -p_cantidad, v_stock_anterior, v_stock_anterior - p_cantidad, CONCAT('VENTA-', p_venta_id));
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `registrar_venta` (IN `p_vendedor_id` INT, IN `p_total` DECIMAL(10,2), IN `p_subtotal` DECIMAL(10,2), IN `p_metodo_pago` VARCHAR(20), IN `p_cliente_nombre` VARCHAR(150), OUT `p_venta_id` INT)   BEGIN
    DECLARE v_folio VARCHAR(20);
    

    SET v_folio = CONCAT('V-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(RAND() * 10000), 4, '0'));
    

    INSERT INTO ventas (folio, vendedor_id, total, subtotal, metodo_pago, cliente_nombre)
    VALUES (v_folio, p_vendedor_id, p_total, p_subtotal, p_metodo_pago, p_cliente_nombre);
    
    SET p_venta_id = LAST_INSERT_ID();
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalles_venta`
--

CREATE TABLE `detalles_venta` (
  `id` int(11) NOT NULL,
  `venta_id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `producto_nombre` varchar(200) NOT NULL,
  `cantidad` int(11) NOT NULL DEFAULT 1,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `descuento` decimal(10,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Disparadores `detalles_venta`
--
DELIMITER $$
CREATE TRIGGER `after_detalle_venta_insert` AFTER INSERT ON `detalles_venta` FOR EACH ROW BEGIN
    CALL actualizar_stock_venta(NEW.producto_id, NEW.cantidad, NEW.venta_id);
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimientos_inventario`
--

CREATE TABLE `movimientos_inventario` (
  `id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `tipo_movimiento` enum('entrada','salida','ajuste','venta','devolucion') NOT NULL,
  `cantidad` int(11) NOT NULL,
  `stock_anterior` int(11) NOT NULL,
  `stock_nuevo` int(11) NOT NULL,
  `referencia` varchar(100) DEFAULT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp(),
  `notas` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id` int(11) NOT NULL,
  `codigo_barras` varchar(50) DEFAULT NULL,
  `nombre` varchar(200) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `categoria` varchar(100) DEFAULT NULL,
  `precio` decimal(10,2) NOT NULL DEFAULT 0.00,
  `costo` decimal(10,2) DEFAULT 0.00,
  `stock` int(11) NOT NULL DEFAULT 0,
  `stock_minimo` int(11) DEFAULT 5,
  `unidad` varchar(20) DEFAULT 'pcs',
  `proveedor` varchar(150) DEFAULT NULL,
  `imagen_url` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id`, `codigo_barras`, `nombre`, `descripcion`, `categoria`, `precio`, `costo`, `stock`, `stock_minimo`, `unidad`, `proveedor`, `imagen_url`, `activo`, `created_by`, `created_at`, `updated_at`) VALUES
(36, '7501234567890', 'Coca-Cola 600ml', 'Refresco de cola 600ml', 'Bebidas', 15.00, 10.00, 100, 20, 'pza', 'Coca-Cola FEMSA', NULL, 1, 9, '2026-02-07 16:01:36', '2026-02-07 16:01:36'),
(37, '7501234567891', 'Sabritas Original 45g', 'Papas fritas sabor original', 'Botanas', 12.00, 8.00, 80, 15, 'pza', 'PepsiCo', NULL, 1, 9, '2026-02-07 16:01:36', '2026-02-07 16:01:36'),
(38, '7501234567892', 'Bimbo Blanco Grande', 'Pan de caja blanco grande', 'Panadería', 35.00, 25.00, 50, 10, 'pza', 'Grupo Bimbo', NULL, 1, 9, '2026-02-07 16:01:36', '2026-02-07 16:01:36'),
(39, '7501234567893', 'Leche Lala 1L', 'Leche entera 1 litro', 'Lácteos', 22.00, 18.00, 60, 12, 'pza', 'Grupo Lala', NULL, 1, 9, '2026-02-07 16:01:36', '2026-02-07 16:01:36'),
(40, '7501234567894', 'Huevo San Juan 12pz', 'Huevo blanco 12 piezas', 'Abarrotes', 45.00, 35.00, 40, 8, 'pza', 'Bachoco', NULL, 1, 9, '2026-02-07 16:01:36', '2026-02-07 16:01:36'),
(41, '7501234567895', 'Tortillas 1kg', 'Tortillas de maíz', 'Tortillería', 20.00, 15.00, 30, 5, 'kg', 'La Tortillería', NULL, 1, 9, '2026-02-07 16:01:36', '2026-02-07 16:01:36'),
(42, '7501234567896', 'Agua Ciel 1.5L', 'Agua purificada', 'Bebidas', 10.00, 7.00, 120, 25, 'pza', 'Coca-Cola', NULL, 1, 9, '2026-02-07 16:01:36', '2026-02-07 16:01:36'),
(43, '7501234567897', 'Jabón Roma', 'Jabón de tocador', 'Higiene', 8.00, 5.00, 90, 15, 'pza', 'Henkel', NULL, 1, 9, '2026-02-07 16:01:36', '2026-02-07 16:01:36'),
(44, '7501234567898', 'Galletas Marías', 'Galletas marías 340g', 'Galletas', 18.00, 12.00, 70, 10, 'pza', 'Gamesa', NULL, 1, 9, '2026-02-07 16:01:36', '2026-02-07 16:01:36'),
(45, '7501234567899', 'Aceite 123 900ml', 'Aceite vegetal', 'Abarrotes', 35.00, 28.00, 45, 8, 'pza', 'Patrona', NULL, 1, 9, '2026-02-07 16:01:36', '2026-02-07 16:01:36');

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `productos_bajo_stock`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `productos_bajo_stock` (
`id` int(11)
,`nombre` varchar(200)
,`codigo_barras` varchar(50)
,`categoria` varchar(100)
,`stock` int(11)
,`stock_minimo` int(11)
,`precio` decimal(10,2)
);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sesiones`
--

CREATE TABLE `sesiones` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `top_productos_vendidos`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `top_productos_vendidos` (
`id` int(11)
,`nombre` varchar(200)
,`categoria` varchar(100)
,`total_vendido` decimal(32,0)
,`ingresos_generados` decimal(32,2)
);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `rol` enum('admin','vendedor') NOT NULL DEFAULT 'vendedor',
  `activo` tinyint(1) DEFAULT 1,
  `telefono` varchar(20) DEFAULT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_login` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password_hash`, `rol`, `activo`, `telefono`, `avatar_url`, `created_at`, `updated_at`, `last_login`) VALUES
(9, 'Administrador', 'admin@tienda.com', '$2a$10$YQ7qZ4k6rYvKJ7VlXZNY0eXKJZV8rH5jNjYQZ9XvLqKHXwZqYJ7.G', 'admin', 1, '555-0001', NULL, '2026-02-07 16:01:36', '2026-02-07 16:01:36', '2026-02-07 16:01:36'),
(10, 'Juan Vendedor', 'vendedor@tienda.com', '$2a$10$3iYqZ5kJ7VvKJ8WmXZNY1eXKJZV8rH6jNjYQZ9XvLqKHXwZqYJ8.H', 'vendedor', 1, '555-0002', NULL, '2026-02-07 16:01:36', '2026-02-07 16:01:36', '2026-02-07 16:01:36');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas`
--

CREATE TABLE `ventas` (
  `id` int(11) NOT NULL,
  `folio` varchar(20) NOT NULL,
  `vendedor_id` int(11) NOT NULL,
  `fecha_venta` timestamp NOT NULL DEFAULT current_timestamp(),
  `total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `impuestos` decimal(10,2) DEFAULT 0.00,
  `descuento` decimal(10,2) DEFAULT 0.00,
  `metodo_pago` enum('efectivo','tarjeta','transferencia','mixto') DEFAULT 'efectivo',
  `estado` enum('completada','cancelada','pendiente') DEFAULT 'completada',
  `cliente_nombre` varchar(150) DEFAULT NULL,
  `cliente_telefono` varchar(20) DEFAULT NULL,
  `notas` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `ventas_diarias`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `ventas_diarias` (
`fecha` date
,`total_ventas` bigint(21)
,`total_ingresos` decimal(32,2)
,`ticket_promedio` decimal(14,6)
,`vendedor` varchar(100)
);

-- --------------------------------------------------------

--
-- Estructura para la vista `productos_bajo_stock`
--
DROP TABLE IF EXISTS `productos_bajo_stock`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `productos_bajo_stock`  AS SELECT `p`.`id` AS `id`, `p`.`nombre` AS `nombre`, `p`.`codigo_barras` AS `codigo_barras`, `p`.`categoria` AS `categoria`, `p`.`stock` AS `stock`, `p`.`stock_minimo` AS `stock_minimo`, `p`.`precio` AS `precio` FROM `productos` AS `p` WHERE `p`.`stock` <= `p`.`stock_minimo` AND `p`.`activo` = 1 ;

-- --------------------------------------------------------

--
-- Estructura para la vista `top_productos_vendidos`
--
DROP TABLE IF EXISTS `top_productos_vendidos`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `top_productos_vendidos`  AS SELECT `p`.`id` AS `id`, `p`.`nombre` AS `nombre`, `p`.`categoria` AS `categoria`, sum(`dv`.`cantidad`) AS `total_vendido`, sum(`dv`.`subtotal`) AS `ingresos_generados` FROM ((`productos` `p` join `detalles_venta` `dv` on(`p`.`id` = `dv`.`producto_id`)) join `ventas` `v` on(`dv`.`venta_id` = `v`.`id`)) WHERE `v`.`estado` = 'completada' GROUP BY `p`.`id`, `p`.`nombre`, `p`.`categoria` ORDER BY sum(`dv`.`cantidad`) DESC ;

-- --------------------------------------------------------

--
-- Estructura para la vista `ventas_diarias`
--
DROP TABLE IF EXISTS `ventas_diarias`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `ventas_diarias`  AS SELECT cast(`v`.`fecha_venta` as date) AS `fecha`, count(0) AS `total_ventas`, sum(`v`.`total`) AS `total_ingresos`, avg(`v`.`total`) AS `ticket_promedio`, `u`.`nombre` AS `vendedor` FROM (`ventas` `v` join `usuarios` `u` on(`v`.`vendedor_id` = `u`.`id`)) WHERE `v`.`estado` = 'completada' GROUP BY cast(`v`.`fecha_venta` as date), `v`.`vendedor_id`, `u`.`nombre` ;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `detalles_venta`
--
ALTER TABLE `detalles_venta`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_venta` (`venta_id`),
  ADD KEY `idx_producto` (`producto_id`);

--
-- Indices de la tabla `movimientos_inventario`
--
ALTER TABLE `movimientos_inventario`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_producto` (`producto_id`),
  ADD KEY `idx_tipo` (`tipo_movimiento`),
  ADD KEY `idx_fecha` (`fecha`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo_barras` (`codigo_barras`),
  ADD KEY `idx_nombre` (`nombre`),
  ADD KEY `idx_codigo_barras` (`codigo_barras`),
  ADD KEY `idx_categoria` (`categoria`),
  ADD KEY `idx_activo` (`activo`),
  ADD KEY `idx_stock` (`stock`),
  ADD KEY `created_by` (`created_by`);

--
-- Indices de la tabla `sesiones`
--
ALTER TABLE `sesiones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `idx_token` (`token`),
  ADD KEY `idx_usuario` (`usuario_id`),
  ADD KEY `idx_expires` (`expires_at`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_rol` (`rol`),
  ADD KEY `idx_activo` (`activo`);

--
-- Indices de la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `folio` (`folio`),
  ADD KEY `idx_folio` (`folio`),
  ADD KEY `idx_vendedor` (`vendedor_id`),
  ADD KEY `idx_fecha` (`fecha_venta`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_metodo_pago` (`metodo_pago`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `detalles_venta`
--
ALTER TABLE `detalles_venta`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `movimientos_inventario`
--
ALTER TABLE `movimientos_inventario`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT de la tabla `sesiones`
--
ALTER TABLE `sesiones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `ventas`
--
ALTER TABLE `ventas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `detalles_venta`
--
ALTER TABLE `detalles_venta`
  ADD CONSTRAINT `detalles_venta_ibfk_1` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `detalles_venta_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`);

--
-- Filtros para la tabla `movimientos_inventario`
--
ALTER TABLE `movimientos_inventario`
  ADD CONSTRAINT `movimientos_inventario_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `movimientos_inventario_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `productos`
--
ALTER TABLE `productos`
  ADD CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `sesiones`
--
ALTER TABLE `sesiones`
  ADD CONSTRAINT `sesiones_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD CONSTRAINT `ventas_ibfk_1` FOREIGN KEY (`vendedor_id`) REFERENCES `usuarios` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
