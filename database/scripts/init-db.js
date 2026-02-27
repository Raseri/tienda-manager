import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function initDatabase() {
    console.log('🔧 Iniciando configuración de base de datos...\n');

    let connection;

    try {
        // Conectar a MySQL con la base de datos especificada
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'tienda_manager',
            multipleStatements: true
        });

        console.log('✅ Conectado a MySQL');

        // Verificar si ya existen tablas
        const [existingTables] = await connection.query('SHOW TABLES');

        if (existingTables.length > 0) {
            console.log(`⚠️  La base de datos ya tiene ${existingTables.length} tabla(s):`);
            existingTables.forEach(table => {
                console.log('  - ' + Object.values(table)[0]);
            });
            console.log('\n¿Desea continuar de todas formas? Esto puede causar errores.');
            // Para simplificar, continuaremos
        }

        // Leer el archivo SQL
        const schemaPath = path.join(__dirname, '..', 'database_schema.sql');

        if (!fs.existsSync(schemaPath)) {
            throw new Error(`No se encontró el archivo: ${schemaPath}`);
        }

        const sql = fs.readFileSync(schemaPath, 'utf8');

        console.log('📄 Leyendo archivo database_schema.sql...');
        console.log('⚙️  Ejecutando script SQL...\n');

        // Ejecutar el script SQL
        await connection.query(sql);

        console.log('✅ Script SQL ejecutado exitosamente');

        // Verificar que las tablas fueron creadas
        const [tables] = await connection.query('SHOW TABLES');

        console.log(`\n📊 Tablas en la base de datos (${tables.length} total):`);
        tables.forEach(table => {
            console.log('  ✓ ' + Object.values(table)[0]);
        });

        // Verificar datos iniciales
        const [usuarios] = await connection.query('SELECT COUNT(*) as count FROM usuarios');
        const [productos] = await connection.query('SELECT COUNT(*) as count FROM productos');

        console.log(`\n📊 Datos iniciales:`);
        console.log(`  - Usuarios: ${usuarios[0].count}`);
        console.log(`  - Productos: ${productos[0].count}`);

        console.log('\n🎉 ¡Base de datos inicializada exitosamente!');
        console.log('\n💡 Ahora puede recargar la página del frontend.');

    } catch (error) {
        console.error('\n❌ Error al configurar la base de datos:');
        console.error('Detalles:', error.message);

        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\n💡 Sugerencia: Verifique las credenciales en el archivo .env');
            console.error(`   DB_USER=${process.env.DB_USER}`);
            console.error(`   DB_PASSWORD=***`);
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.error('\n💡 Sugerencia: La base de datos no existe. Créela primero con:');
            console.error(`   CREATE DATABASE ${process.env.DB_NAME};`);
        }

        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

initDatabase();
