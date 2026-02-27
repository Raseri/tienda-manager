// formatters.js - Utilidades para formateo de datos

// Formatear cantidad como moneda
export function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2
    }).format(amount);
}

// Formatear fecha
export function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
    };

    // Si es un Timestamp de Firebase
    if (date && date.toDate) {
        date = date.toDate();
    }

    // Si es string, convertir a Date
    if (typeof date === 'string') {
        date = new Date(date);
    }

    return new Intl.DateTimeFormat('es-MX', defaultOptions).format(date);
}

// Formatear fecha y hora
export function formatDateTime(date) {
    return formatDate(date, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Formatear solo la hora
export function formatTime(date) {
    if (date && date.toDate) {
        date = date.toDate();
    }

    if (typeof date === 'string') {
        date = new Date(date);
    }

    return new Intl.DateTimeFormat('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Formatear número
export function formatNumber(num, decimals = 0) {
    return new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(num);
}

// Capitalizar primera letra
export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Truncar texto
export function truncate(str, maxLength = 50) {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
}
