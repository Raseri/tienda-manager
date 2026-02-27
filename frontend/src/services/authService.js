// authService.js - Servicio de autenticación HÍBRIDO (API + Fallback)
import { api, endpoints } from './api.js';

// Obtener usuario actual
export function getCurrentUser() {
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (!userStr) return null;

    try {
        return JSON.parse(userStr);
    } catch (error) {
        console.error('Error al parsear usuario:', error);
        return null;
    }
}

// Verificar si el usuario está autenticado
export function isAuthenticated() {
    const user = getCurrentUser();
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    return !!(user && token);
}

// Verificar rol del usuario
export function hasRole(requiredRole) {
    const user = getCurrentUser();
    if (!user) return false;

    if (Array.isArray(requiredRole)) {
        return requiredRole.includes(user.rol);
    }

    return user.rol === requiredRole;
}

// Verificar si es admin
export function isAdmin() {
    return hasRole('admin');
}

// Verificar si es vendedor
export function isVendedor() {
    return hasRole('vendedor');
}

// Verificar si es repartidor
export function isRepartidor() {
    return hasRole('repartidor');
}

// Login HÍBRIDO: intenta API primero, luego fallback a demo
export async function login(email, password, remember = false) {
    try {
        console.log('🔐 Intentando login (Híbrido: API + Demo fallback)...');

        // INTENTO 1: Intentar con API real
        try {
            const response = await api.post(endpoints.login, { email, password });

            if (response && response.token) {
                // Login exitoso con API
                const storage = remember ? localStorage : sessionStorage;
                storage.setItem('user', JSON.stringify(response.user));
                storage.setItem('authToken', response.token);

                console.log('✅ Login exitoso con API REAL:', response.user.nombre);
                return { success: true, user: response.user, source: 'api' };
            }
        } catch (apiError) {
            console.warn('⚠️ API no disponible o credenciales incorrectas, probando modo DEMO...');
        }

        // INTENTO 2: Fallback a usuarios DEMO
        const demoUser = await loginWithDemoData(email, password);
        if (demoUser) {
            const storage = remember ? localStorage : sessionStorage;
            storage.setItem('user', JSON.stringify(demoUser));
            storage.setItem('authToken', 'demo-token-' + Date.now());

            console.log('✅ Login exitoso con DEMO:', demoUser.nombre);
            return { success: true, user: demoUser, source: 'demo' };
        }

        // Ambos métodos fallaron
        throw new Error('Correo o contraseña incorrectos');
    } catch (error) {
        console.error('❌ Error en login:', error);
        return {
            success: false,
            error: error.message || 'Error al iniciar sesión'
        };
    }
}

// Función auxiliar: Login con datos demo
async function loginWithDemoData(email, password) {
    const demoUsers = {
        'admin@tienda.com': {
            id: 1,
            nombre: 'Administrador',
            email: 'admin@tienda.com',
            password: 'admin123',
            rol: 'admin',
            avatar: 'A',
            telefono: '555-0001'
        },
        'vendedor@tienda.com': {
            id: 2,
            nombre: 'Vendedor Demo',
            email: 'vendedor@tienda.com',
            password: 'vendedor123',
            rol: 'vendedor',
            avatar: 'V',
            telefono: '555-0002'
        },
        'repartidor@tienda.com': {
            id: 3,
            nombre: 'Repartidor Demo',
            email: 'repartidor@tienda.com',
            password: 'repartidor123',
            rol: 'repartidor',
            avatar: '🛵',
            telefono: '555-0003'
        }
    };

    const user = demoUsers[email];
    if (!user || user.password !== password) {
        return null;
    }

    const { password: _, ...userData } = user;
    return userData;
}

// Register con API real
export async function register(userData) {
    try {
        console.log('📝 Registrando usuario con API real...', userData.email);

        const response = await api.post(endpoints.register, userData);

        if (!response || !response.user) {
            throw new Error('Respuesta inválida del servidor');
        }

        // Auto-login después del registro
        if (response.token) {
            sessionStorage.setItem('user', JSON.stringify(response.user));
            sessionStorage.setItem('authToken', response.token);
        }

        console.log('✅ Registro exitoso:', response.user);
        return { success: true, user: response.user };
    } catch (error) {
        console.error('❌ Error en registro:', error);
        return {
            success: false,
            error: error.message || 'Error al registrar usuario'
        };
    }
}

// Logout
export function logout() {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    console.log('👋 Sesión cerrada');
    return { success: true };
}
