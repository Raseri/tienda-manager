// routes/auth.js - Rutas de autenticación
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Registro de usuario
router.post('/register', async (req, res) => {
    try {
        const { nombre, email, password, rol = 'vendedor', telefono } = req.body;

        // Validaciones
        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        // Verificar si el email ya existe
        const [existing] = await db.query(
            'SELECT id FROM usuarios WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            return res.status(409).json({ error: 'El correo ya está registrado' });
        }

        // Hashear contraseña
        const password_hash = await bcrypt.hash(password, 10);

        // Insertar usuario
        const [result] = await db.query(
            `INSERT INTO usuarios (nombre, email, password_hash, rol, telefono, activo) 
             VALUES (?, ?, ?, ?, ?, true)`,
            [nombre, email, password_hash, rol, telefono || null]
        );

        // Obtener usuario creado
        const [newUser] = await db.query(
            'SELECT id, nombre, email, rol, telefono, created_at FROM usuarios WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            user: newUser[0]
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        // Buscar usuario
        const [users] = await db.query(
            'SELECT * FROM usuarios WHERE email = ? AND activo = true',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const user = users[0];

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        // Generar JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                rol: user.rol
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        // Actualizar last_login
        await db.query(
            'UPDATE usuarios SET last_login = NOW() WHERE id = ?',
            [user.id]
        );

        // Enviar respuesta (sin password_hash)
        const { password_hash, ...userData } = user;

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                ...userData,
                avatar: user.nombre.charAt(0).toUpperCase()
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

// Obtener usuario actual (requiere autenticación)
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, nombre, email, rol, telefono, avatar_url, created_at, last_login FROM usuarios WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({
            user: {
                ...users[0],
                avatar: users[0].nombre.charAt(0).toUpperCase()
            }
        });
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({ error: 'Error al obtener datos del usuario' });
    }
});

export default router;
