// envios.js — Módulo de Envíos / Logística (Admin)
import './envios.css';
import { getCurrentUser, isAdmin } from '../../services/authService.js';

const API = '/api';
let enviosMap = null;
let enviosLeafletReady = false;
let pedidosData = [];
let tabActual = 'pendiente';
const enviosMarkersMap = {};

// =====================================================================
// RENDER PRINCIPAL
// =====================================================================
export function renderEnvios(container) {
    container.innerHTML = '';

    container.innerHTML =
        '<div class="envios-container">' +

        '<div class="envios-header">' +
        '<div class="envios-header-info">' +
        '<h3>📦 Envíos Pendientes</h3>' +
        '<p>Gestiona y crea pedidos a domicilio</p>' +
        '</div>' +
        '<div id="envios-header-actions"></div>' +
        '</div>' +

        '<div class="envios-stats">' +
        '<div class="estat"><span class="estat-val" id="est-total">0</span><span class="estat-lbl">Total</span></div>' +
        '<div class="estat pendiente"><span class="estat-val" id="est-pend">0</span><span class="estat-lbl">Pendientes</span></div>' +
        '<div class="estat en-camino"><span class="estat-val" id="est-camino">0</span><span class="estat-lbl">En Camino</span></div>' +
        '<div class="estat entregado"><span class="estat-val" id="est-entregados">0</span><span class="estat-lbl">Entregados</span></div>' +
        '</div>' +

        '<div class="envios-body">' +
        '<div class="envios-mapa-card">' +
        '<div class="envios-mapa-title">🗺️ Mapa de Pedidos</div>' +
        '<div id="envios-map"></div>' +
        '</div>' +

        '<div class="envios-panel">' +
        '<div class="envios-tabs">' +
        '<button class="etab activo" data-tab="pendiente">📋 Pendientes</button>' +
        '<button class="etab" data-tab="en_camino">🛵 En Camino</button>' +
        '<button class="etab" data-tab="entregado">✅ Entregados</button>' +
        '</div>' +
        '<div class="envios-lista" id="envios-lista"></div>' +
        '</div>' +
        '</div>' +
        '</div>';

    // Botón Nueva Orden
    if (isAdmin()) {
        const actBtn = container.querySelector('#envios-header-actions');
        actBtn.innerHTML =
            '<button id="btn-nuevo-pedido" style="display:inline-flex;align-items:center;gap:6px;padding:10px 18px;background:var(--color-primary);color:white;border:none;border-radius:var(--radius-lg);font-size:var(--font-size-sm);font-weight:600;font-family:var(--font-family);cursor:pointer;">➕ Nuevo Pedido</button>';
        container.querySelector('#btn-nuevo-pedido').addEventListener('click', () => mostrarFormPedido());
    }

    // Tabs
    container.querySelectorAll('.etab').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.etab').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            tabActual = btn.dataset.tab;
            renderListaPedidos();
        });
    });

    // Cargar datos y mapa
    cargarPedidos();
    cargarLeafletEnvios().then(() => {
        setTimeout(() => {
            inicializarMapaEnvios();
            if (enviosMap) enviosMap.invalidateSize();
        }, 150);
    });
}

// =====================================================================
// CARGAR PEDIDOS DESDE API (con fallback a demo)
// =====================================================================
async function cargarPedidos() {
    try {
        const user = getCurrentUser();
        const res = await fetch(API + '/pedidos?rol=' + (user?.rol || 'admin') + '&id=' + (user?.id || 1));
        if (res.ok) {
            const json = await res.json();
            pedidosData = json.data || [];
        } else { throw new Error('API no disponible'); }
    } catch {
        // Demo data fallback
        pedidosData = getDemoPedidos();
    }
    actualizarEstadisticasEnvios();
    renderListaPedidos();
    if (enviosMap) renderMarcadoresEnvios();
}

function getDemoPedidos() {
    const raw = localStorage.getItem('tienda_pedidos_demo');
    if (raw) {
        try { return JSON.parse(raw); } catch { /* fallthrough */ }
    }
    const demo = [
        {
            id: 1, folio: 'P-20260225-1001', cliente_nombre: 'Juan Pérez',
            cliente_telefono: '222 111 2233', cliente_direccion: 'Av. Reforma 45, Puebla',
            cliente_lat: 19.0450, cliente_lng: -98.2100, estado: 'pendiente',
            metodo_pago: 'efectivo', total: 185.00, notas: 'Tocar el timbre',
            productos: [{ nombre: 'Coca-Cola 600ml', cantidad: 3, precio_unitario: 15, subtotal: 45 }, { nombre: 'Sabritas 45g', cantidad: 2, precio_unitario: 12, subtotal: 24 }]
        },
        {
            id: 2, folio: 'P-20260225-1002', cliente_nombre: 'María García',
            cliente_telefono: '222 987 6543', cliente_direccion: 'Blvd. Atlixco 200, Puebla',
            cliente_lat: 19.0560, cliente_lng: -98.2300, estado: 'en_camino',
            metodo_pago: 'tarjeta', total: 320.00,
            productos: [{ nombre: 'Pan Blanco Bimbo', cantidad: 2, precio_unitario: 35, subtotal: 70 }, { nombre: 'Leche Lala 1L', cantidad: 5, precio_unitario: 22, subtotal: 110 }]
        },
        {
            id: 3, folio: 'P-20260225-1003', cliente_nombre: 'Carlos Ruiz',
            cliente_telefono: '222 555 7788', cliente_direccion: 'Calle 5 de Mayo 10, Centro',
            cliente_lat: 19.0420, cliente_lng: -98.2040, estado: 'entregado',
            metodo_pago: 'efectivo', total: 95.00,
            productos: [{ nombre: 'Huevos San Juan 12pz', cantidad: 1, precio_unitario: 45, subtotal: 45 }]
        }
    ];
    localStorage.setItem('tienda_pedidos_demo', JSON.stringify(demo));
    return demo;
}

// =====================================================================
// ESTADÍSTICAS
// =====================================================================
function actualizarEstadisticasEnvios() {
    const sel = id => document.querySelector('#' + id);
    if (sel('est-total')) sel('est-total').textContent = pedidosData.length;
    if (sel('est-pend')) sel('est-pend').textContent = pedidosData.filter(p => p.estado === 'pendiente').length;
    if (sel('est-camino')) sel('est-camino').textContent = pedidosData.filter(p => p.estado === 'en_camino').length;
    if (sel('est-entregados')) sel('est-entregados').textContent = pedidosData.filter(p => p.estado === 'entregado').length;
}

// =====================================================================
// LISTA DE PEDIDOS
// =====================================================================
function renderListaPedidos() {
    const lista = document.querySelector('#envios-lista');
    if (!lista) return;

    const filtrados = pedidosData.filter(p => p.estado === tabActual);

    if (!filtrados.length) {
        lista.innerHTML =
            '<div class="envios-empty">' +
            '<span class="envios-empty-icon">📭</span>' +
            '<p>No hay pedidos en este estado</p>' +
            '</div>';
        return;
    }

    lista.innerHTML = '';
    filtrados.forEach(p => {
        const card = document.createElement('div');
        card.className = 'pedido-card';
        const prodsList = (p.productos || []).map(pr => pr.nombre + ' x' + pr.cantidad).join(', ');
        card.innerHTML =
            '<div class="pedido-card-top">' +
            '<div>' +
            '<div class="pedido-folio">' + p.folio + '</div>' +
            '<div class="pedido-nombre">' + p.cliente_nombre + '</div>' +
            '</div>' +
            '<span class="pedido-badge ' + p.estado + '">' + labelEstado(p.estado) + '</span>' +
            '</div>' +
            '<p class="pedido-dir">📍 ' + p.cliente_direccion + '</p>' +
            '<p class="pedido-dir" style="color:var(--text-tertiary);font-size:11px;">📦 ' + (prodsList || 'Sin productos') + '</p>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
            '<span class="pedido-total">$' + parseFloat(p.total).toFixed(2) + '</span>' +
            '<span style="font-size:12px;color:var(--text-tertiary);">' + iconMetodo(p.metodo_pago) + ' ' + (p.metodo_pago || '') + '</span>' +
            '</div>' +
            '<div class="pedido-actions">' +
            '<button class="pedido-btn btn-ver-mapa" data-id="' + p.id + '">🎯 Ver en mapa</button>' +
            (p.estado === 'pendiente' ? '<button class="pedido-btn danger btn-cancelar" data-id="' + p.id + '">✕ Cancelar</button>' : '') +
            '</div>';

        card.querySelector('.btn-ver-mapa').addEventListener('click', () => {
            if (enviosMap && p.cliente_lat && p.cliente_lng) {
                enviosMap.flyTo([p.cliente_lat, p.cliente_lng], 16, { animate: true, duration: 0.6 });
                if (enviosMarkersMap[p.id]) enviosMarkersMap[p.id].openPopup();
            }
        });

        const cancelBtn = card.querySelector('.btn-cancelar');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => cancelarPedido(p.id));
        }

        lista.appendChild(card);
    });
}

function labelEstado(e) {
    return { pendiente: '⏳ Pendiente', en_camino: '🛵 En camino', entregado: '✅ Entregado', cancelado: '✕ Cancelado' }[e] || e;
}
function iconMetodo(m) {
    return { efectivo: '💵', tarjeta: '💳', transferencia: '🏦' }[m] || '💳';
}

// =====================================================================
// CANCELAR PEDIDO
// =====================================================================
async function cancelarPedido(id) {
    if (!confirm('¿Cancelar este pedido?')) return;
    try {
        await fetch(API + '/pedidos/' + id, { method: 'DELETE' });
    } catch { /* offline */ }
    // Demo: actualizar en localStorage
    const demo = pedidosData.map(p => p.id === id ? { ...p, estado: 'cancelado' } : p);
    pedidosData = demo;
    localStorage.setItem('tienda_pedidos_demo', JSON.stringify(demo));
    actualizarEstadisticasEnvios();
    renderListaPedidos();
    renderMarcadoresEnvios();
}

// =====================================================================
// MAPA LEAFLET
// =====================================================================
function cargarLeafletEnvios() {
    if (enviosLeafletReady && window.L) return Promise.resolve();
    return new Promise((resolve, reject) => {
        if (!document.querySelector('#leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css'; link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }
        if (!document.querySelector('#leaflet-js')) {
            const s = document.createElement('script');
            s.id = 'leaflet-js'; s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            s.onload = () => { enviosLeafletReady = true; resolve(); };
            s.onerror = reject;
            document.head.appendChild(s);
        } else if (window.L) {
            enviosLeafletReady = true; resolve();
        } else {
            document.querySelector('#leaflet-js').addEventListener('load', () => { enviosLeafletReady = true; resolve(); });
        }
    });
}

function inicializarMapaEnvios() {
    const el = document.querySelector('#envios-map');
    if (!el || !window.L) return;
    if (enviosMap) { enviosMap.remove(); enviosMap = null; }

    enviosMap = window.L.map('envios-map', {
        center: [19.0413, -98.2062],
        zoom: 12,
        scrollWheelZoom: true
    });
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 19
    }).addTo(enviosMap);

    renderMarcadoresEnvios();
}

function renderMarcadoresEnvios() {
    if (!enviosMap || !window.L) return;

    Object.values(enviosMarkersMap).forEach(m => enviosMap.removeLayer(m));
    Object.keys(enviosMarkersMap).forEach(k => delete enviosMarkersMap[k]);

    const activos = pedidosData.filter(p => p.estado !== 'cancelado' && p.cliente_lat);
    activos.forEach(p => {
        const color = { pendiente: '#f59e0b', en_camino: '#3b82f6', entregado: '#22c55e' }[p.estado] || '#667eea';
        const icon = window.L.divIcon({
            html:
                '<div style="background:' + color + ';width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);">' +
                '<span style="display:block;transform:rotate(45deg);text-align:center;line-height:28px;font-size:14px;">📦</span>' +
                '</div>',
            iconSize: [34, 34],
            iconAnchor: [17, 34],
            popupAnchor: [0, -38],
            className: ''
        });

        const prodsList = (p.productos || []).map(pr => pr.nombre + ' ×' + pr.cantidad).join('<br>');
        const popup = window.L.popup({ maxWidth: 270, minWidth: 220 }).setContent(
            '<div style="font-family:inherit">' +
            '<p style="font-weight:700;margin:0 0 4px;">' + p.cliente_nombre + '</p>' +
            '<p style="font-size:12px;color:#666;margin:0 0 6px;">📍 ' + p.cliente_direccion + '</p>' +
            '<div style="font-size:12px;margin:0 0 8px;line-height:1.6;">' + prodsList + '</div>' +
            '<p style="font-weight:700;margin:0 0 6px;">Total: $' + parseFloat(p.total).toFixed(2) + '</p>' +
            '<a href="https://www.google.com/maps/dir/?api=1&destination=' + p.cliente_lat + ',' + p.cliente_lng + '" target="_blank" style="display:inline-block;padding:5px 10px;background:#667eea;color:white;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;">🧭 Navegar</a>' +
            '</div>'
        );
        const marker = window.L.marker([p.cliente_lat, p.cliente_lng], { icon }).bindPopup(popup).addTo(enviosMap);
        enviosMarkersMap[p.id] = marker;
    });
}

// =====================================================================
// FORMULARIO NUEVO PEDIDO
// =====================================================================
function mostrarFormPedido() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-xl);padding:24px;width:100%;max-width:600px;box-shadow:var(--shadow-xl);max-height:90vh;overflow-y:auto;';

    // Cargar productos disponibles
    let productosCatalogo = [];

    modal.innerHTML =
        '<style>' +
        '.fp-label{display:block;font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:6px;}' +
        '.fp-input{width:100%;padding:10px 14px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:var(--radius-md);color:var(--text-primary);font-size:14px;font-family:var(--font-family);box-sizing:border-box;transition:all 0.2s;}' +
        '.fp-input:focus{outline:none;border-color:var(--color-primary);box-shadow:0 0 0 3px rgba(59,130,246,0.15);}' +
        '.fp-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;}' +
        '.prod-line{display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:8px;background:var(--bg-primary);border-radius:var(--radius-md);}' +
        '.prod-line select,.prod-line input{flex:1;padding:8px 10px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:var(--radius-md);color:var(--text-primary);font-size:13px;font-family:var(--font-family);}' +
        '.prod-line input[type=number]{max-width:70px;}' +
        '</style>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">' +
        '<h3 style="margin:0;font-size:18px;font-weight:700;color:var(--text-primary);">📦 Nuevo Pedido</h3>' +
        '<button id="fp-close" style="background:none;border:none;color:var(--text-secondary);font-size:22px;cursor:pointer;">✕</button>' +
        '</div>' +

        '<div style="margin-bottom:12px;"><label class="fp-label">Cliente *</label><input id="fp-cliente" class="fp-input" type="text" placeholder="Nombre del cliente" /></div>' +
        '<div class="fp-row">' +
        '<div><label class="fp-label">Teléfono</label><input id="fp-tel" class="fp-input" type="tel" placeholder="222 000 0000" /></div>' +
        '<div><label class="fp-label">Método de pago</label><select id="fp-pago" class="fp-input"><option value="efectivo">💵 Efectivo</option><option value="tarjeta">💳 Tarjeta</option><option value="transferencia">🏦 Transferencia</option></select></div>' +
        '</div>' +

        // Geocoder
        '<div style="margin-bottom:12px;">' +
        '<label class="fp-label">🔍 Buscar dirección del cliente</label>' +
        '<div style="display:flex;gap:8px;">' +
        '<input id="fp-geo" class="fp-input" type="text" placeholder="Ej: Av. Reforma 45, Puebla" style="flex:1;" />' +
        '<button id="fp-geo-btn" style="padding:10px 14px;background:var(--color-primary);border:none;border-radius:var(--radius-md);color:white;font-size:13px;font-weight:600;font-family:var(--font-family);cursor:pointer;white-space:nowrap;">Buscar</button>' +
        '</div>' +
        '</div>' +
        '<div style="margin-bottom:12px;"><label class="fp-label">Dirección de entrega *</label><input id="fp-dir" class="fp-input" type="text" placeholder="Se llena al buscar, o escribe manualmente" /></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">' +
        '<div style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:8px 12px;"><div style="font-size:10px;color:var(--text-tertiary);font-weight:700;text-transform:uppercase;">Lat</div><div id="fp-lat-disp" style="font-size:13px;color:var(--color-primary);font-weight:700;font-family:monospace;">19.041300</div></div>' +
        '<div style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:8px 12px;"><div style="font-size:10px;color:var(--text-tertiary);font-weight:700;text-transform:uppercase;">Lng</div><div id="fp-lng-disp" style="font-size:13px;color:var(--color-primary);font-weight:700;font-family:monospace;">-98.206200</div></div>' +
        '</div>' +
        '<input id="fp-lat" type="hidden" value="19.0413" /><input id="fp-lng" type="hidden" value="-98.2062" />' +

        // Productos
        '<div style="margin-bottom:12px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
        '<label class="fp-label" style="margin:0;">Productos del pedido *</label>' +
        '<button id="fp-add-prod" style="padding:5px 10px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:var(--radius-md);color:var(--text-secondary);font-size:12px;font-weight:600;cursor:pointer;">➕ Agregar</button>' +
        '</div>' +
        '<div id="fp-prods-list"><p style="color:var(--text-tertiary);font-size:13px;">Cargando productos...</p></div>' +
        '</div>' +

        '<div style="margin-bottom:20px;"><label class="fp-label">Notas</label><input id="fp-notas" class="fp-input" type="text" placeholder="Instrucciones especiales..." /></div>' +

        '<div style="display:flex;gap:12px;justify-content:flex-end;">' +
        '<button id="fp-cancel" style="padding:10px 20px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:var(--radius-lg);color:var(--text-secondary);font-family:var(--font-family);font-size:14px;cursor:pointer;">Cancelar</button>' +
        '<button id="fp-save" style="padding:10px 24px;background:var(--color-primary);border:none;border-radius:var(--radius-lg);color:white;font-family:var(--font-family);font-size:14px;font-weight:600;cursor:pointer;">Crear Pedido</button>' +
        '</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Cerrar
    const cerrar = () => overlay.remove();
    overlay.querySelector('#fp-close').addEventListener('click', cerrar);
    overlay.querySelector('#fp-cancel').addEventListener('click', cerrar);
    overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(); });

    // Geocoder del cliente
    async function buscarDirCliente() {
        const q = overlay.querySelector('#fp-geo').value.trim();
        if (!q) return;
        const btn = overlay.querySelector('#fp-geo-btn');
        btn.textContent = '⏳'; btn.disabled = true;
        try {
            const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(q) + '&limit=1&accept-language=es');
            const data = await r.json();
            if (data && data[0]) {
                const lat = parseFloat(data[0].lat), lng = parseFloat(data[0].lon);
                overlay.querySelector('#fp-lat').value = lat;
                overlay.querySelector('#fp-lng').value = lng;
                overlay.querySelector('#fp-lat-disp').textContent = lat.toFixed(6);
                overlay.querySelector('#fp-lng-disp').textContent = lng.toFixed(6);
                const short = data[0].display_name.split(',').slice(0, 4).join(',').trim();
                overlay.querySelector('#fp-dir').value = short;
                overlay.querySelector('#fp-geo').value = '';
            } else {
                alert('No se encontró la dirección. Intenta con más detalles.');
            }
        } catch { alert('Error de red al buscar dirección.'); }
        finally { btn.textContent = 'Buscar'; btn.disabled = false; }
    }
    overlay.querySelector('#fp-geo').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); buscarDirCliente(); } });
    overlay.querySelector('#fp-geo-btn').addEventListener('click', buscarDirCliente);

    // Productos
    async function cargarProductosCatalogo() {
        try {
            const r = await fetch(API + '/pedidos/productos');
            if (r.ok) { const j = await r.json(); productosCatalogo = j.data || []; }
            else throw new Error();
        } catch {
            productosCatalogo = [
                { id: 1, nombre: 'Coca-Cola 600ml', precio: 15, stock: 100 },
                { id: 2, nombre: 'Sabritas Original 45g', precio: 12, stock: 80 },
                { id: 3, nombre: 'Pan Blanco Bimbo', precio: 35, stock: 30 },
                { id: 4, nombre: 'Leche Lala 1L', precio: 22, stock: 50 },
                { id: 5, nombre: 'Huevos San Juan 12pz', precio: 45, stock: 25 }
            ];
        }
        renderLineaProducto();
    }

    function renderLineaProducto() {
        const lista = overlay.querySelector('#fp-prods-list');
        if (!lista.querySelector('.prod-line')) {
            lista.innerHTML = '';
            agregarLineaProducto();
        }
    }

    function agregarLineaProducto() {
        const lista = overlay.querySelector('#fp-prods-list');
        const div = document.createElement('div');
        div.className = 'prod-line';
        div.innerHTML =
            '<select class="pl-sel">' +
            productosCatalogo.map(p => '<option value="' + p.id + '" data-precio="' + p.precio + '">' + p.nombre + ' — $' + p.precio + '</option>').join('') +
            '</select>' +
            '<input type="number" class="pl-qty" value="1" min="1" max="99" />' +
            '<span class="pl-sub" style="font-size:13px;font-weight:700;color:var(--color-primary);min-width:60px;text-align:right;">$' + (productosCatalogo[0]?.precio || 0) + '.00</span>' +
            '<button class="pl-del" style="background:none;border:none;color:var(--color-danger);cursor:pointer;font-size:16px;">✕</button>';

        const sel = div.querySelector('.pl-sel');
        const qty = div.querySelector('.pl-qty');
        const sub = div.querySelector('.pl-sub');

        function actualizarSub() {
            const precio = parseFloat(sel.options[sel.selectedIndex]?.dataset.precio || 0);
            const cant = parseInt(qty.value) || 1;
            sub.textContent = '$' + (precio * cant).toFixed(2);
        }
        sel.addEventListener('change', actualizarSub);
        qty.addEventListener('input', actualizarSub);
        div.querySelector('.pl-del').addEventListener('click', () => {
            if (overlay.querySelectorAll('.prod-line').length > 1) div.remove();
        });

        lista.appendChild(div);
    }

    overlay.querySelector('#fp-add-prod').addEventListener('click', () => {
        if (productosCatalogo.length) agregarLineaProducto();
    });

    cargarProductosCatalogo();

    // Guardar
    overlay.querySelector('#fp-save').addEventListener('click', async () => {
        const cliente = overlay.querySelector('#fp-cliente').value.trim();
        const dir = overlay.querySelector('#fp-dir').value.trim();
        const lat = parseFloat(overlay.querySelector('#fp-lat').value);
        const lng = parseFloat(overlay.querySelector('#fp-lng').value);
        const pago = overlay.querySelector('#fp-pago').value;
        const notas = overlay.querySelector('#fp-notas').value.trim();
        const tel = overlay.querySelector('#fp-tel').value.trim();

        if (!cliente || !dir) { alert('El nombre del cliente y la dirección son obligatorios.'); return; }

        // Recolectar líneas de productos
        const lineas = [];
        overlay.querySelectorAll('.prod-line').forEach(line => {
            const sel = line.querySelector('.pl-sel');
            const qty = parseInt(line.querySelector('.pl-qty').value) || 1;
            const optSel = sel.options[sel.selectedIndex];
            if (optSel) {
                lineas.push({
                    producto_id: parseInt(optSel.value),
                    producto_nombre: optSel.text.split(' — ')[0],
                    cantidad: qty,
                    precio_unitario: parseFloat(optSel.dataset.precio)
                });
            }
        });
        if (!lineas.length) { alert('Agrega al menos un producto.'); return; }

        const user = getCurrentUser();
        const total = lineas.reduce((s, l) => s + l.precio_unitario * l.cantidad, 0);
        const folio = 'P-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + (Math.floor(Math.random() * 9000) + 1000);

        const nuevoPedido = {
            id: Date.now(), folio,
            cliente_nombre: cliente, cliente_telefono: tel,
            cliente_direccion: dir, cliente_lat: lat, cliente_lng: lng,
            estado: 'pendiente', metodo_pago: pago, total, notas,
            creado_por: user?.id || 1,
            productos: lineas.map(l => ({ nombre: l.producto_nombre, cantidad: l.cantidad, precio_unitario: l.precio_unitario, subtotal: l.precio_unitario * l.cantidad }))
        };

        // Intentar guardar en API
        try {
            await fetch(API + '/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...nuevoPedido, productos: lineas })
            });
        } catch { /* offline, guardar en demo */ }

        // Siempre actualizar demo local
        pedidosData.push(nuevoPedido);
        localStorage.setItem('tienda_pedidos_demo', JSON.stringify(pedidosData));
        actualizarEstadisticasEnvios();
        tabActual = 'pendiente';
        document.querySelectorAll('.etab').forEach(b => {
            b.classList.toggle('activo', b.dataset.tab === 'pendiente');
        });
        renderListaPedidos();
        renderMarcadoresEnvios();
        cerrar();
    });
}

// =====================================================================
// CLEANUP
// =====================================================================
export function cleanupEnvios() {
    if (enviosMap) { enviosMap.remove(); enviosMap = null; }
    Object.keys(enviosMarkersMap).forEach(k => delete enviosMarkersMap[k]);
    pedidosData = [];
}
