// productos.js - Módulo de gestión de productos
import './productos.css';
import { createProductoCard } from './ProductoCard.js';
import { createButton } from '../../components/Button.js';
import { showModal } from '../../components/Modal.js';
import { createInput, createTextarea } from '../../components/Input.js';
import {
    obtenerProductos,
    agregarProducto,
    actualizarProducto,
    eliminarProducto
} from '../../services/productosService.js';
import {
    validarRequerido,
    validarPrecio,
    validarStock,
    validarFormulario
} from '../../utils/validators.js';

let productos = [];
let productosFiltrados = [];
let unsubscribe = null;

// Renderizar vista de productos
export function renderProductos(container) {
    container.innerHTML = '';
    container.className = 'app-content';

    const productosContainer = document.createElement('div');
    productosContainer.className = 'productos-container';

    // Header con búsqueda y botón de nuevo producto
    const header = document.createElement('div');
    header.className = 'productos-header';

    // Barra de búsqueda
    const searchContainer = document.createElement('div');
    searchContainer.className = 'productos-search';
    searchContainer.innerHTML = `
    <svg class="productos-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35"/>
    </svg>
    <input type="text" id="search-productos" placeholder="Buscar productos..." />
  `;

    // Botón de nuevo producto
    const btnNuevo = createButton({
        text: 'Nuevo Producto',
        variant: 'primary',
        icon: '➕',
        onClick: () => mostrarFormularioProducto()
    });

    header.appendChild(searchContainer);
    header.appendChild(btnNuevo);

    // Grid de productos
    const grid = document.createElement('div');
    grid.className = 'productos-grid';
    grid.id = 'productos-grid';

    productosContainer.appendChild(header);
    productosContainer.appendChild(grid);
    container.appendChild(productosContainer);

    // Event listener para búsqueda
    const searchInput = container.querySelector('#search-productos');
    searchInput.addEventListener('input', (e) => {
        filtrarProductos(e.target.value);
    });

    // Escuchar cambios en tiempo real
    if (unsubscribe) unsubscribe();
    unsubscribe = obtenerProductos((data) => {
        productos = data;
        productosFiltrados = data;
        renderGrid();
    });
}

// Renderizar grid de productos
function renderGrid() {
    const grid = document.querySelector('#productos-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (productosFiltrados.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = `
      <div class="empty-state-icon">📦</div>
      <h3 class="empty-state-title">No hay productos</h3>
      <p class="empty-state-description">
        ${productos.length === 0
                ? 'Comienza agregando tu primer producto'
                : 'No se encontraron productos con ese criterio de búsqueda'}
      </p>
    `;
        grid.appendChild(empty);
        return;
    }

    productosFiltrados.forEach(producto => {
        const card = createProductoCard(producto, {
            onEditar: (p) => mostrarFormularioProducto(p),
            onEliminar: (p) => confirmarEliminar(p)
        });
        grid.appendChild(card);
    });
}

// Filtrar productos
function filtrarProductos(query) {
    const q = query.toLowerCase().trim();

    if (!q) {
        productosFiltrados = productos;
    } else {
        productosFiltrados = productos.filter(p =>
            p.nombre.toLowerCase().includes(q) ||
            (p.codigo && p.codigo.toLowerCase().includes(q)) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(q))
        );
    }

    renderGrid();
}

// Mostrar formulario de producto (crear o editar)
function mostrarFormularioProducto(producto = null) {
    const esEdicion = !!producto;

    const formContainer = document.createElement('div');

    // Crear campos del formulario
    const inputNombre = createInput({
        label: 'Nombre del producto',
        name: 'nombre',
        value: producto?.nombre || '',
        placeholder: 'Ej: Coca Cola 600ml',
        required: true
    });

    const inputCodigo = createInput({
        label: 'Código/SKU',
        name: 'codigo',
        value: producto?.codigo || '',
        placeholder: 'Ej: PROD-001'
    });

    const inputPrecio = createInput({
        label: 'Precio',
        name: 'precio',
        type: 'number',
        value: producto?.precio || '',
        placeholder: '0.00',
        required: true
    });

    const inputStock = createInput({
        label: 'Stock',
        name: 'stock',
        type: 'number',
        value: producto?.stock || '',
        placeholder: '0',
        required: true
    });

    const inputDescripcion = createTextarea({
        label: 'Descripción',
        name: 'descripcion',
        value: producto?.descripcion || '',
        placeholder: 'Descripción opcional del producto',
        rows: 3
    });

    // Layout del formulario
    formContainer.innerHTML = '<div class="form-grid"></div>';
    const formGrid = formContainer.querySelector('.form-grid');

    formGrid.appendChild(inputNombre);
    formGrid.appendChild(inputCodigo);
    formGrid.appendChild(inputPrecio);
    formGrid.appendChild(inputStock);

    const descContainer = document.createElement('div');
    descContainer.className = 'form-full';
    descContainer.appendChild(inputDescripcion);
    formGrid.appendChild(descContainer);

    // Botones de acción
    const actions = document.createElement('div');
    actions.className = 'form-actions';

    const btnCancelar = createButton({
        text: 'Cancelar',
        variant: 'secondary',
        onClick: () => modal.remove()
    });

    const btnGuardar = createButton({
        text: esEdicion ? 'Guardar Cambios' : 'Crear Producto',
        variant: 'primary',
        onClick: () => guardarProducto()
    });

    actions.appendChild(btnCancelar);
    actions.appendChild(btnGuardar);
    formContainer.appendChild(actions);

    // Mostrar modal
    const modal = showModal({
        title: esEdicion ? 'Editar Producto' : 'Nuevo Producto',
        content: formContainer
    });

    // Función para guardar
    async function guardarProducto() {
        const nombre = formContainer.querySelector('[name="nombre"]').value.trim();
        const codigo = formContainer.querySelector('[name="codigo"]').value.trim();
        const precio = formContainer.querySelector('[name="precio"]').value;
        const stock = formContainer.querySelector('[name="stock"]').value;
        const descripcion = formContainer.querySelector('[name="descripcion"]').value.trim();

        // Validar
        const { esValido, errores } = validarFormulario({
            nombre: () => validarRequerido(nombre, 'Nombre'),
            precio: () => validarPrecio(precio),
            stock: () => validarStock(stock)
        });

        if (!esValido) {
            alert(Object.values(errores).join('\n'));
            return;
        }

        // Crear objeto de producto
        const datosProducto = {
            nombre,
            codigo: codigo || null,
            precio: Number(precio),
            stock: Number(stock),
            descripcion: descripcion || null
        };

        // Guardar en Firebase
        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Guardando...';

        let resultado;
        if (esEdicion) {
            resultado = await actualizarProducto(producto.id, datosProducto);
        } else {
            resultado = await agregarProducto(datosProducto);
        }

        if (resultado.success) {
            modal.remove();
            // Mostrar notificación de éxito (simple alert por ahora)
            alert(esEdicion ? '✅ Producto actualizado' : '✅ Producto creado');
        } else {
            alert('❌ Error: ' + resultado.error);
            btnGuardar.disabled = false;
            btnGuardar.textContent = esEdicion ? 'Guardar Cambios' : 'Crear Producto';
        }
    }
}

// Confirmar eliminación
function confirmarEliminar(producto) {
    const confirmContainer = document.createElement('div');
    confirmContainer.innerHTML = `
    <p style="margin-bottom: var(--spacing-4); color: var(--text-secondary)">
      ¿Estás seguro de que deseas eliminar el producto "<strong>${producto.nombre}</strong>"?
    </p>
    <p style="font-size: var(--font-size-sm); color: var(--text-tertiary)">
      Esta acción no eliminará el producto permanentemente, solo lo marcará como inactivo.
    </p>
  `;

    const actions = document.createElement('div');
    actions.className = 'form-actions';

    const btnCancelar = createButton({
        text: 'Cancelar',
        variant: 'secondary',
        onClick: () => modal.remove()
    });

    const btnEliminar = createButton({
        text: 'Eliminar',
        variant: 'danger',
        onClick: async () => {
            btnEliminar.disabled = true;
            btnEliminar.textContent = 'Eliminando...';

            const resultado = await eliminarProducto(producto.id);

            if (resultado.success) {
                modal.remove();
                alert('✅ Producto eliminado');
            } else {
                alert('❌ Error: ' + resultado.error);
                btnEliminar.disabled = false;
                btnEliminar.textContent = 'Eliminar';
            }
        }
    });

    actions.appendChild(btnCancelar);
    actions.appendChild(btnEliminar);
    confirmContainer.appendChild(actions);

    const modal = showModal({
        title: '⚠️ Confirmar Eliminación',
        content: confirmContainer
    });
}

// Limpiar al salir del módulo
export function cleanupProductos() {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
}
