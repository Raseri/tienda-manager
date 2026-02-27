import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

console.log('📋 Configuración leída del .env:');
console.log(` - DB_HOST: ${process.env.DB_HOST}`);
console.log(` - DB_PORT: ${process.env.DB_PORT}`);
console.log(` - DB_USER: ${process.env.DB_USER}`);
console.log(` - DB_PASSWORD: ${process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-3) : '(vacío)'}`);
console.log(` - DB_NAME: ${process.env.DB_NAME}\n`);

async function testConnection() {
    let conn;
    try {
        console.log('🔌 Intentando conectar SIN especificar base de datos...');
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });
        console.log('✅ ¡Conexión exitosa!\n');

        // Listar bases de datos
        console.log('📊 Bases de datos disponibles:');
        const [databases] = await conn.query('SHOW DATABASES');
        databases.forEach(db => console.log(`  - ${Object.values(db)[0]}`));

        // Seleccionar nuestra base de datos
        console.log(`\n🎯 Usando base de datos '${process.env.DB_NAME}'...`);
        await conn.query(`USE \`${process.env.DB_NAME}\``);

        // Listar tablas
        console.log('📋 Tablas existentes:');
        const [tables] = await conn.query('SHOW TABLES');
        if (tables.length === 0) {
            console.log('  ⚠️  No hay tablas (la base de datos está vacía)');
        } else {
            tables.forEach(table => console.log(`  ✓ ${Object.values(table)[0]}`));
        }

        await conn.end();

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Código de error:', error.code);
        if (conn) await conn.end();
        process.exit(1);
    }
}

testConnection();
