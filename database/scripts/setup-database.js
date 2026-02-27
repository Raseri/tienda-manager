import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function setupDatabase() {
    console.log('🔧 Iniciando configuración de base de datos...\n');

    try {
        // Conectar a MySQL (sin especificar base de datos)
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: true
        });

        console.log('✅ Conectado a MySQL');

        // Leer el archivo SQL
        const schemaPath = path.join(__dirname, '..', 'database_schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');

        console.log('📄 Leyendo archivo database_schema.sql...');

        // Ejecutar el script SQL
        console.log('⚙️  Ejecutando script SQL...\n');
        await connection.query(sql);

        console.log('✅ Base de datos creada exitosamente');
        console.log('✅ Tablas creadas correctamente');
        console.log('✅ Vistas creadas');
        console.log('✅ Datos iniciales insertados\n');

        // Verificar que las tablas fueron creadas
        await connection.query('USE tienda_manager');
        const [tables] = await connection.query('SHOW TABLES');

        console.log('📊 Tablas creadas:');
        tables.forEach(table => {
            console.log('  - ' + Object.values(table)[0]);
        });

        await connection.end();
        console.log('\n🎉 ¡Configuración completada exitosamente!');

    } catch (error) {
        console.error('❌ Error al configurar la base de datos:');
        console.error(error.message);
        process.exit(1);
    }
}

setupDatabase();
