// ProductoCard.js - Componente de tarjeta individual de producto

import { formatCurrency } from '../../utils/formatters.js';

export function createProductoCard(producto, { onEditar, onEliminar }) {
    const card = document.createElement('div');
    card.className = 'producto-card';
    card.dataset.id = producto.id;

    // Determinar estado del stock
    let stockClass = 'stock-alto';
    if (producto.stock <= 5) stockClass = 'stock-bajo';
    else if (producto.stock <= 20) stockClass = 'stock-medio';

    card.innerHTML = `
    <div class="producto-card-header">
      <div>
        <h3 class="producto-nombre">${producto.nombre}</h3>
        <p class="producto-codigo">${producto.codigo || 'Sin código'}</p>
      </div>
      <div class="producto-menu">
        <button class="btn-editar" title="Editar producto">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-eliminar" title="Eliminar producto">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
    
    <div class="producto-info">
      <div class="producto-precio">${formatCurrency(producto.precio)}</div>
      <div class="producto-stock">
        <span>Stock:</span>
        <span class="stock-badge ${stockClass}">${producto.stock} unidades</span>
      </div>
    </div>
    
    ${producto.descripcion ? `
      <p class="producto-descripcion">${producto.descripcion}</p>
    ` : ''}
  `;

    // Event listeners
    card.querySelector('.btn-editar').addEventListener('click', () => onEditar(producto));
    card.querySelector('.btn-eliminar').addEventListener('click', () => onEliminar(producto));

    return card;
}
