// validators.js - Validadores de formularios

// Validar campo requerido
export function validarRequerido(valor, nombreCampo = 'Este campo') {
    if (!valor || (typeof valor === 'string' && valor.trim() === '')) {
        return `${nombreCampo} es requerido`;
    }
    return null;
}

// Validar número positivo
export function validarNumeroPositivo(valor, nombreCampo = 'Este campo') {
    const num = Number(valor);
    if (isNaN(num)) {
        return `${nombreCampo} debe ser un número`;
    }
    if (num < 0) {
        return `${nombreCampo} debe ser positivo`;
    }
    return null;
}

// Validar precio
export function validarPrecio(valor, nombreCampo = 'Precio') {
    const error = validarNumeroPositivo(valor, nombreCampo);
    if (error) return error;

    const num = Number(valor);
    if (num === 0) {
        return `${nombreCampo} debe ser mayor a 0`;
    }

    return null;
}

// Validar stock
export function validarStock(valor, nombreCampo = 'Stock') {
    const error = validarNumeroPositivo(valor, nombreCampo);
    if (error) return error;

    const num = Number(valor);
    if (!Number.isInteger(num)) {
        return `${nombreCampo} debe ser un número entero`;
    }

    return null;
}

// Validar longitud mínima
export function validarLongitudMinima(valor, minimo, nombreCampo = 'Este campo') {
    if (!valor || valor.length < minimo) {
        return `${nombreCampo} debe tener al menos ${minimo} caracteres`;
    }
    return null;
}

// Validar formulario completo
export function validarFormulario(campos) {
    const errores = {};
    let esValido = true;

    Object.entries(campos).forEach(([nombre, validador]) => {
        const error = validador();
        if (error) {
            errores[nombre] = error;
            esValido = false;
        }
    });

    return { esValido, errores };
}
