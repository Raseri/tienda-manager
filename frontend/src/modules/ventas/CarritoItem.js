// CarritoItem.js - Componente de ítem en el carrito
import { formatCurrency } from '../../utils/formatters.js';

export function createCarritoItem(item, { onCambiarCantidad, onRemover }) {
    const div = document.createElement('div');
    div.className = 'carrito-item';
    div.dataset.id = item.productoId;

    const subtotal = item.precio * item.cantidad;

    div.innerHTML = `
    <div class="carrito-item-header">
      <div class="carrito-item-nombre">${item.nombre}</div>
      <button class="carrito-item-remove" title="Eliminar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    
    <div class="carrito-item-controls">
      <div class="cantidad-controls">
        <button class="cantidad-btn btn-decrementar" ${item.cantidad <= 1 ? 'disabled' : ''}>-</button>
        <span class="cantidad-valor">${item.cantidad}</span>
        <button class="cantidad-btn btn-incrementar" ${item.cantidad >= item.stockDisponible ? 'disabled' : ''}>+</button>
      </div>
      <div class="carrito-item-subtotal">${formatCurrency(subtotal)}</div>
    </div>
  `;

    // Event listeners
    div.querySelector('.btn-decrementar').addEventListener('click', () => {
        if (item.cantidad > 1) {
            onCambiarCantidad(item.productoId, item.cantidad - 1);
        }
    });

    div.querySelector('.btn-incrementar').addEventListener('click', () => {
        if (item.cantidad < item.stockDisponible) {
            onCambiarCantidad(item.productoId, item.cantidad + 1);
        }
    });

    div.querySelector('.carrito-item-remove').addEventListener('click', () => {
        onRemover(item.productoId);
    });

    return div;
}
