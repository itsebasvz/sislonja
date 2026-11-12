-- Sistema Lonja: importar en una base vacía seleccionada. No contiene credenciales.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS `tipo` (
  `id_tpo` smallint(6) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(30) NOT NULL,
  PRIMARY KEY (`id_tpo`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `especie` (
  `id_epe` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(25) NOT NULL,
  `imagen` varchar(100) NOT NULL,
  `descripcion` varchar(1000) NOT NULL DEFAULT '',
  `id_tpo` smallint(6) NOT NULL,
  PRIMARY KEY (`id_epe`),
  UNIQUE KEY `nombre` (`nombre`),
  KEY `id_tpo` (`id_tpo`),
  CONSTRAINT `especie_ibfk_1` FOREIGN KEY (`id_tpo`) REFERENCES `tipo` (`id_tpo`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `comprador` (
  `codigo_cpr` smallint(6) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) NOT NULL,
  `apellido_paterno` varchar(80) NOT NULL,
  `apellido_materno` varchar(80) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `direccion` varchar(200) NOT NULL,
  `correo` varchar(80) NOT NULL,
  PRIMARY KEY (`codigo_cpr`),
  UNIQUE KEY `correo` (`correo`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `direccion` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `etiqueta` varchar(40) NOT NULL,
  `calle` varchar(120) NOT NULL,
  `numero` varchar(30) NOT NULL,
  `cp` varchar(5) NOT NULL,
  `colonia` varchar(200) NOT NULL,
  `estado_id` varchar(2) NOT NULL,
  `estado` varchar(60) NOT NULL,
  `municipio_id` varchar(3) NOT NULL,
  `municipio` varchar(120) NOT NULL,
  `predeterminada` tinyint(1) NOT NULL DEFAULT 0,
  `codigo_cpr` smallint(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `codigo_cpr` (`codigo_cpr`),
  CONSTRAINT `direccion_ibfk_1` FOREIGN KEY (`codigo_cpr`) REFERENCES `comprador` (`codigo_cpr`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `usuario` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `comprador_id` smallint(6) DEFAULT NULL,
  `nombre` varchar(80) NOT NULL,
  `apellido` varchar(80) NOT NULL,
  `email` varchar(80) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` enum('admin','operador','cliente') NOT NULL DEFAULT 'operador',
  `confirmar` tinyint(1) NOT NULL DEFAULT 0,
  `token` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `comprador_id` (`comprador_id`),
  UNIQUE KEY `token` (`token`),
  CONSTRAINT `usuario_ibfk_1` FOREIGN KEY (`comprador_id`) REFERENCES `comprador` (`codigo_cpr`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `lote` (
  `presentacion` varchar(80) NOT NULL DEFAULT '',
  `conservacion` varchar(40) NOT NULL DEFAULT '',
  `calibre` varchar(80) NOT NULL DEFAULT '',
  `procedencia` varchar(160) NOT NULL DEFAULT '',
  `id_lte` int(11) NOT NULL AUTO_INCREMENT,
  `kilos` decimal(10,3) NOT NULL,
  `numero_cajas` smallint(6) NOT NULL,
  `precio_kilo_salida` decimal(10,2) NOT NULL,
  `fecha` datetime NOT NULL,
  `id_epe` int(11) NOT NULL,
  PRIMARY KEY (`id_lte`),
  KEY `id_epe` (`id_epe`),
  CONSTRAINT `lote_ibfk_1` FOREIGN KEY (`id_epe`) REFERENCES `especie` (`id_epe`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `pedido` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `clave` varchar(64) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `codigo_cpr` smallint(6) NOT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'pendiente',
  `fecha` datetime NOT NULL,
  `subtotal` decimal(14,2) NOT NULL,
  `envio` decimal(10,2) NOT NULL,
  `total` decimal(14,2) NOT NULL,
  `entrega` varchar(15) NOT NULL,
  `datos_entrega` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`datos_entrega`)),
  `metodo` varchar(15) NOT NULL,
  `referencia` varchar(80) NOT NULL,
  `marca` varchar(20) DEFAULT NULL,
  `ultimos` varchar(4) DEFAULT NULL,
  `motivo` varchar(300) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clave` (`clave`),
  KEY `usuario_id` (`usuario_id`),
  KEY `codigo_cpr` (`codigo_cpr`),
  CONSTRAINT `pedido_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `pedido_ibfk_2` FOREIGN KEY (`codigo_cpr`) REFERENCES `comprador` (`codigo_cpr`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `compra` (
  `id_cmp` int(11) NOT NULL AUTO_INCREMENT,
  `id_lte` int(11) NOT NULL,
  `lote_vigente_id` int(11) DEFAULT NULL,
  `estado` varchar(15) NOT NULL DEFAULT 'activa',
  `detalle` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`detalle`)),
  `precio_kilo_final` decimal(10,2) NOT NULL,
  `precio_total` decimal(14,2) NOT NULL,
  `fecha` datetime NOT NULL,
  `codigo_cpr` smallint(6) NOT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `pedido_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_cmp`),
  UNIQUE KEY `lote_vigente_id` (`lote_vigente_id`),
  KEY `codigo_cpr` (`codigo_cpr`),
  KEY `usuario_id` (`usuario_id`),
  KEY `pedido_id` (`pedido_id`),
  KEY `compra_lote_historia` (`id_lte`),
  CONSTRAINT `compra_ibfk_1` FOREIGN KEY (`id_lte`) REFERENCES `lote` (`id_lte`) ON UPDATE CASCADE,
  CONSTRAINT `compra_ibfk_2` FOREIGN KEY (`lote_vigente_id`) REFERENCES `lote` (`id_lte`) ON UPDATE CASCADE,
  CONSTRAINT `compra_ibfk_3` FOREIGN KEY (`codigo_cpr`) REFERENCES `comprador` (`codigo_cpr`) ON UPDATE CASCADE,
  CONSTRAINT `compra_ibfk_4` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `compra_ibfk_5` FOREIGN KEY (`pedido_id`) REFERENCES `pedido` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

