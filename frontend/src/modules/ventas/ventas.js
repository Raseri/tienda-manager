// ventas.js - Módulo de punto de venta (POS)
import './ventas.css';
import { createCarritoItem } from './CarritoItem.js';
import { createButton } from '../../components/Button.js';
import { showModal } from '../../components/Modal.js';
import { createInput } from '../../components/Input.js';
import { obtenerProductosActivos } from '../../services/productosService.js';
import { registrarVenta } from '../../services/ventasService.js';
import { formatCurrency } from '../../utils/formatters.js';

let productos = [];
let carrito = [];
let unsubscribe = null;
let scannerStream = null;   // Referencia al stream de la cámara para poder detenerlo

// Renderizar vista de ventas
export function renderVentas(container) {
    container.innerHTML = '';
    container.className = 'app-content';

    const ventasContainer = document.createElement('div');
    ventasContainer.className = 'ventas-container';

    // Panel izquierdo: Productos
    const productosPanel = crearPanelProductos();

    // Panel derecho: Carrito
    const carritoPanel = crearPanelCarrito();

    ventasContainer.appendChild(productosPanel);
    ventasContainer.appendChild(carritoPanel);
    container.appendChild(ventasContainer);

    // Cargar productos
    cargarProductos();
}

// Crear panel de productos
function crearPanelProductos() {
    const panel = document.createElement('div');
    panel.className = 'ventas-productos';

    // Búsqueda + botón de escáner
    const searchContainer = document.createElement('div');
    searchContainer.className = 'ventas-search-wrapper';
    searchContainer.innerHTML = `
      <div class="ventas-search">
        <div class="ventas-search-icon">🔍</div>
        <input type="text" id="search-ventas" placeholder="Buscar productos..." />
      </div>
      <button class="btn-scanner" id="btn-barcode-scanner" title="Escanear código de barras">
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
          <path d="M2 6h2v12H2V6zm3 0h1v12H5V6zm2 0h3v12H7V6zm4 0h1v12h-1V6zm3 0h2v12h-2V6zm3 0h1v12h-1V6zm2 0h2v12h-2V6zM1 4v16h22V4H1zm20 14H3V6h18v12z"/>
        </svg>
        <span>Escanear</span>
      </button>
    `;

    // Lista de productos
    const lista = document.createElement('div');
    lista.className = 'productos-list';
    lista.id = 'productos-ventas-list';

    panel.appendChild(searchContainer);
    panel.appendChild(lista);

    // Event listener para búsqueda
    searchContainer.querySelector('#search-ventas').addEventListener('input', (e) => {
        filtrarYRenderizarProductos(e.target.value);
    });

    // Event listener para el escáner
    searchContainer.querySelector('#btn-barcode-scanner').addEventListener('click', () => {
        abrirEscanerCodigoBarras();
    });

    return panel;
}

// ─── LECTOR DE CÓDIGO DE BARRAS ───────────────────────────────────────────────
async function abrirEscanerCodigoBarras() {
    // Verificar si el navegador soporta BarcodeDetector
    if (!('BarcodeDetector' in window)) {
        alert('⚠️ Tu navegador no soporta el lector de códigos de barras.\nIntenta con Chrome para Android o Chrome desktop reciente.');
        return;
    }

    // Crear overlay del escáner
    const overlay = document.createElement('div');
    overlay.className = 'scanner-overlay';
    overlay.id = 'scanner-overlay';
    overlay.innerHTML = `
      <div class="scanner-modal">
        <div class="scanner-header">
          <div class="scanner-title">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M2 6h2v12H2V6zm3 0h1v12H5V6zm2 0h3v12H7V6zm4 0h1v12h-1V6zm3 0h2v12h-2V6zm3 0h1v12h-1V6zm2 0h2v12h-2V6zM1 4v16h22V4H1zm20 14H3V6h18v12z"/>
            </svg>
            Escáner de Código de Barras
          </div>
          <button class="scanner-close" id="scanner-close-btn">✕</button>
        </div>
        <div class="scanner-body">
          <div class="scanner-video-wrapper">
            <video id="scanner-video" autoplay playsinline muted></video>
            <div class="scanner-crosshair">
              <div class="scanner-line"></div>
            </div>
          </div>
          <p class="scanner-hint">📱 Apunta la cámara al código de barras del producto</p>
          <div class="scanner-result" id="scanner-result" style="display:none"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const video = overlay.querySelector('#scanner-video');
    const resultDiv = overlay.querySelector('#scanner-result');
    const closeBtn = overlay.querySelector('#scanner-close-btn');

    function cerrarEscaner() {
        if (scannerStream) {
            scannerStream.getTracks().forEach(t => t.stop());
            scannerStream = null;
        }
        overlay.remove();
    }

    closeBtn.addEventListener('click', cerrarEscaner);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrarEscaner(); });

    try {
        // Solicitar acceso a la cámara trasera preferentemente
        scannerStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }
        });
        video.srcObject = scannerStream;
        await video.play();

        // Instanciar el detector de códigos de barras (solo 1D)
        const detector = new BarcodeDetector({
            formats: [
                'code_128', 'code_39', 'code_93',
                'ean_13', 'ean_8', 'upc_a', 'upc_e',
                'itf', 'codabar'
            ]
        });

        let detectado = false;

        async function escanearFrame() {
            if (detectado || !overlay.isConnected) return;

            try {
                const barcodes = await detector.detect(video);
                if (barcodes.length > 0) {
                    const codigo = barcodes[0].rawValue;
                    detectado = true;

                    // Buscar producto por código
                    const producto = productos.find(p =>
                        p.codigo && p.codigo.trim().toLowerCase() === codigo.trim().toLowerCase()
                    );

                    // Feedback visual
                    resultDiv.style.display = 'block';

                    if (producto) {
                        resultDiv.className = 'scanner-result scanner-success';
                        resultDiv.innerHTML = `✅ <strong>${producto.nombre}</strong> — ${formatCurrency(producto.precio)}`;
                        // Auto-agregar al carrito después de un breve delay
                        setTimeout(() => {
                            agregarAlCarrito(producto);
                            cerrarEscaner();
                        }, 900);
                    } else {
                        // Código no encontrado, mostrar en búsqueda para buscar manualmente
                        resultDiv.className = 'scanner-result scanner-not-found';
                        resultDiv.innerHTML = `⚠️ Código <strong>${codigo}</strong> no encontrado en productos`;
                        setTimeout(() => {
                            cerrarEscaner();
                            // Poner el código en el buscador
                            const searchInput = document.querySelector('#search-ventas');
                            if (searchInput) {
                                searchInput.value = codigo;
                                filtrarYRenderizarProductos(codigo);
                                searchInput.focus();
                            }
                        }, 1500);
                    }
                    return;
                }
            } catch (_) { /* frame aún no listo */ }

            // Continuar escaneando
            requestAnimationFrame(escanearFrame);
        }

        // Iniciar escaneo cuando el video esté listo
        video.addEventListener('loadeddata', () => {
            requestAnimationFrame(escanearFrame);
        }, { once: true });

    } catch (err) {
        console.error('Error al acceder a la cámara:', err);
        overlay.remove();
        alert('❌ No se pudo acceder a la cámara.\nVerifica que hayas dado permisos al navegador.');
    }
}

// Crear panel de carrito
function crearPanelCarrito() {
    const panel = document.createElement('div');
    panel.className = 'ventas-carrito';

    // Header
    const header = document.createElement('div');
    header.className = 'carrito-header';
    header.innerHTML = '<h2 class="carrito-title">🛒 Carrito</h2>';

    // Items
    const items = document.createElement('div');
    items.className = 'carrito-items';
    items.id = 'carrito-items';

    // Resumen
    const resumen = document.createElement('div');
    resumen.className = 'carrito-resumen';
    resumen.id = 'carrito-resumen';

    // Pago
    const pago = document.createElement('div');
    pago.className = 'carrito-pago';
    pago.id = 'carrito-pago';

    panel.appendChild(header);
    panel.appendChild(items);
    panel.appendChild(resumen);
    panel.appendChild(pago);

    return panel;
}

// Cargar productos desde Firebase
async function cargarProductos() {
    productos = await obtenerProductosActivos();
    filtrarYRenderizarProductos('');
}

// Filtrar y renderizar productos
function filtrarYRenderizarProductos(query) {
    const q = query.toLowerCase().trim();
    const productosFiltrados = productos.filter(p =>
        p.stock > 0 && (
            !q ||
            p.nombre.toLowerCase().includes(q) ||
            (p.codigo && p.codigo.toLowerCase().includes(q))
        )
    );

    const lista = document.querySelector('#productos-ventas-list');
    lista.innerHTML = '';

    if (productosFiltrados.length === 0) {
        lista.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: var(--spacing-8); color: var(--text-tertiary);">
        ${q ? 'No se encontraron productos' : 'No hay productos disponibles'}
      </div>
    `;
        return;
    }

    productosFiltrados.forEach(producto => {
        const item = document.createElement('div');
        item.className = 'producto-item';
        item.innerHTML = `
      <div class="producto-item-nombre">${producto.nombre}</div>
      <div class="producto-item-precio">${formatCurrency(producto.precio)}</div>
      <div class="producto-item-stock">Stock: ${producto.stock}</div>
    `;

        item.addEventListener('click', () => agregarAlCarrito(producto));
        lista.appendChild(item);
    });
}

// Agregar producto al carrito
function agregarAlCarrito(producto) {
    const itemExistente = carrito.find(item => item.productoId === producto.id);

    if (itemExistente) {
        // Verificar stock disponible
        if (itemExistente.cantidad < producto.stock) {
            itemExistente.cantidad++;
        } else {
            alert('⚠️ No hay suficiente stock disponible');
            return;
        }
    } else {
        carrito.push({
            productoId: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: 1,
            stockDisponible: producto.stock
        });
    }

    renderCarrito();
}

// Cambiar cantidad de un item
function cambiarCantidad(productoId, nuevaCantidad) {
    const item = carrito.find(i => i.productoId === productoId);
    if (item) {
        item.cantidad = nuevaCantidad;
        renderCarrito();
    }
}

// Remover item del carrito
function removerItem(productoId) {
    carrito = carrito.filter(i => i.productoId !== productoId);
    renderCarrito();
}

// Renderizar carrito
function renderCarrito() {
    const itemsContainer = document.querySelector('#carrito-items');
    const resumenContainer = document.querySelector('#carrito-resumen');
    const pagoContainer = document.querySelector('#carrito-pago');

    if (carrito.length === 0) {
        itemsContainer.innerHTML = `
      <div class="carrito-empty">
        <div class="carrito-empty-icon">🛒</div>
        <p>El carrito está vacío</p>
        <p style="font-size: var(--font-size-sm);">Selecciona productos para agregar</p>
      </div>
    `;
        resumenContainer.innerHTML = '';
        pagoContainer.innerHTML = '';
        return;
    }

    // Renderizar items
    itemsContainer.innerHTML = '';
    carrito.forEach(item => {
        const itemEl = createCarritoItem(item, {
            onCambiarCantidad: cambiarCantidad,
            onRemover: removerItem
        });
        itemsContainer.appendChild(itemEl);
    });

    // Calcular totales
    const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const cantidadItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);

    // Renderizar resumen
    resumenContainer.innerHTML = `
    <div class="resumen-linea">
      <span>Subtotal (${cantidadItems} items):</span>
      <span>${formatCurrency(subtotal)}</span>
    </div>
    <div class="resumen-total">
      <span>Total:</span>
      <span>${formatCurrency(subtotal)}</span>
    </div>
  `;

    // Botones de pago
    pagoContainer.innerHTML = '';

    const btnLimpiar = createButton({
        text: 'Limpiar',
        variant: 'secondary',
        onClick: limpiarCarrito
    });

    const btnCobrar = createButton({
        text: `Cobrar ${formatCurrency(subtotal)}`,
        variant: 'success',
        fullWidth: false,
        onClick: () => mostrarModalCobro(subtotal)
    });

    pagoContainer.appendChild(btnLimpiar);
    pagoContainer.appendChild(btnCobrar);
}

// Limpiar carrito
function limpiarCarrito() {
    if (carrito.length === 0) return;

    if (confirm('¿Limpiar el carrito?')) {
        carrito = [];
        renderCarrito();
    }
}

// Mostrar modal de cobro
function mostrarModalCobro(total) {
    const formContainer = document.createElement('div');
    formContainer.style.display = 'flex';
    formContainer.style.flexDirection = 'column';
    formContainer.style.gap = 'var(--spacing-4)';

    // Mostrar total
    const totalDiv = document.createElement('div');
    totalDiv.style.textAlign = 'center';
    totalDiv.style.padding = 'var(--spacing-4)';
    totalDiv.style.background = 'var(--bg-tertiary)';
    totalDiv.style.borderRadius = 'var(--radius-lg)';
    totalDiv.innerHTML = `
    <div style="font-size: var(--font-size-sm); color: var(--text-secondary); margin-bottom: var(--spacing-2);">Total a cobrar</div>
    <div style="font-size: var(--font-size-4xl); font-weight: var(--font-weight-bold); color: var(--color-success);">
      ${formatCurrency(total)}
    </div>
  `;

    // Input de pago recibido
    const inputPago = createInput({
        label: 'Pago recibido',
        name: 'pago',
        type: 'number',
        placeholder: '0.00',
        required: true
    });

    // Cambio
    const cambioDiv = document.createElement('div');
    cambioDiv.style.display = 'none';
    cambioDiv.style.textAlign = 'center';
    cambioDiv.style.padding = 'var(--spacing-4)';
    cambioDiv.style.background = 'var(--color-primary-light)';
    cambioDiv.style.borderRadius = 'var(--radius-lg)';
    cambioDiv.id = 'cambio-display';

    // Calcular cambio en tiempo real
    inputPago.querySelector('input').addEventListener('input', (e) => {
        const pago = Number(e.target.value);
        if (pago >= total) {
            const cambio = pago - total;
            cambioDiv.style.display = 'block';
            cambioDiv.innerHTML = `
        <div style="font-size: var(--font-size-sm); color: var(--text-secondary); margin-bottom: var(--spacing-2);">Cambio</div>
        <div style="font-size: var(--font-size-3xl); font-weight: var(--font-weight-bold); color: var(--color-primary);">
          ${formatCurrency(cambio)}
        </div>
      `;
        } else {
            cambioDiv.style.display = 'none';
        }
    });

    formContainer.appendChild(totalDiv);
    formContainer.appendChild(inputPago);
    formContainer.appendChild(cambioDiv);

    // Acciones
    const actions = document.createElement('div');
    actions.className = 'form-actions';

    const btnCancelar = createButton({
        text: 'Cancelar',
        variant: 'secondary',
        onClick: () => modal.remove()
    });

    const btnConfirmar = createButton({
        text: 'Confirmar Venta',
        variant: 'success',
        onClick: () => confirmarVenta(total)
    });

    actions.appendChild(btnCancelar);
    actions.appendChild(btnConfirmar);
    formContainer.appendChild(actions);

    const modal = showModal({
        title: '💰 Completar Venta',
        content: formContainer
    });

    // Enfocar input
    setTimeout(() => inputPago.querySelector('input').focus(), 100);

    // Función para confirmar venta
    async function confirmarVenta(total) {
        const pagoInput = formContainer.querySelector('[name="pago"]');
        const pago = Number(pagoInput.value);

        if (!pago || pago < total) {
            alert('⚠️ El pago recibido debe ser mayor o igual al total');
            pagoInput.focus();
            return;
        }

        btnConfirmar.disabled = true;
        btnConfirmar.textContent = 'Procesando...';

        // Preparar datos de venta
        const venta = {
            items: carrito.map(item => ({
                productoId: item.productoId,
                nombre: item.nombre,
                precio: item.precio,
                cantidad: item.cantidad,
                subtotal: item.precio * item.cantidad,
                stockRestante: item.stockDisponible - item.cantidad
            })),
            subtotal: total,
            total: total,
            pagoRecibido: pago,
            cambio: pago - total
        };

        // Registrar en Firebase
        const resultado = await registrarVenta(venta);

        if (resultado.success) {
            modal.remove();
            alert(`✅ Venta completada\n\nTotal: ${formatCurrency(total)}\nPago: ${formatCurrency(pago)}\nCambio: ${formatCurrency(pago - total)}`);

            // Limpiar carrito y recargar productos
            carrito = [];
            renderCarrito();
            cargarProductos();
        } else {
            alert('❌ Error al registrar venta: ' + resultado.error);
            btnConfirmar.disabled = false;
            btnConfirmar.textContent = 'Confirmar Venta';
        }
    }
}

// Cleanup
export function cleanupVentas() {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
    // Detener la cámara si está activa
    if (scannerStream) {
        scannerStream.getTracks().forEach(t => t.stop());
        scannerStream = null;
    }
    carrito = [];
}
