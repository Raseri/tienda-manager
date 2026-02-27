// sucursales.js - Módulo de gestión de sucursales con mapa Leaflet
import './sucursales.css';
import { isAdmin } from '../../services/authService.js';

// =====================================================================
// DATOS DE SUCURSALES (localStorage, no toca la BD backend)
// =====================================================================
const STORAGE_KEY = 'tienda_manager_sucursales';

const SUCURSALES_DEMO = [
  {
    id: 1,
    nombre: 'Sucursal Centro Histórico',
    lat: 19.0413,
    lng: -98.2062,
    direccion: 'Portal Juárez 6, Centro Histórico, Puebla, Pue.',
    telefono: '222 100 0001',
    horario: 'Lun–Sáb 9:00 – 20:00',
    activa: true
  },
  {
    id: 2,
    nombre: 'Sucursal Angelópolis',
    lat: 18.9999,
    lng: -98.2486,
    direccion: 'Blvd. del Niño Poblano 2510, Reserva Territorial Atlixcáyotl, Puebla, Pue.',
    telefono: '222 100 0002',
    horario: 'Lun–Dom 10:00 – 22:00',
    activa: true
  },
  {
    id: 3,
    nombre: 'Sucursal CAPU',
    lat: 19.0788,
    lng: -98.2093,
    direccion: 'Blvd. Norte 2510, La Providencia, Puebla, Pue.',
    telefono: '222 100 0003',
    horario: 'Lun–Vie 8:00 – 19:00',
    activa: false
  },
  {
    id: 4,
    nombre: 'Sucursal San Manuel',
    lat: 19.0562,
    lng: -98.1965,
    direccion: 'Av. Municipio Libre 4610, San Manuel, Puebla, Pue.',
    telefono: '222 100 0004',
    horario: 'Lun–Sáb 9:00 – 20:00',
    activa: true
  }
];

// =====================================================================
// ESTADO DEL MÓDULO (NO se conecta al backend)
// =====================================================================
let leafletMap = null;
let markerLayer = null;
let sucursales = [];
let sucursalesFiltradas = [];
let leafletLoaded = false;
let selectedMarkerId = null;
const markersMap = {}; // id => leaflet marker

// =====================================================================
// FUNCIÓN PRINCIPAL DE RENDER
// =====================================================================
export function renderSucursales(container) {
  container.innerHTML = '';
  container.className = 'app-content';

  // Cargar datos desde localStorage (o usar demo si es la primera vez)
  sucursales = cargarSucursales();
  sucursalesFiltradas = [...sucursales];

  // HTML del módulo
  container.innerHTML = `
    <div class="sucursales-container">

      <!-- HEADER -->
      <div class="sucursales-header">
        <div class="sucursales-header-info">
          <h3>📍 Gestión de Sucursales</h3>
          <p>Visualiza y administra todas las sucursales en el mapa</p>
        </div>
        <div class="sucursales-actions" id="sucursales-actions">
          <!-- Los botones de admin se inyectan con JS -->
        </div>
      </div>

      <!-- ESTADÍSTICAS -->
      <div class="sucursales-stats">
        <div class="stat-mini">
          <span class="stat-mini-value" id="stat-total">${sucursales.length}</span>
          <span class="stat-mini-label">Total Sucursales</span>
        </div>
        <div class="stat-mini">
          <span class="stat-mini-value" id="stat-abiertas">${sucursales.filter(s => s.activa).length}</span>
          <span class="stat-mini-label">Abiertas</span>
        </div>
        <div class="stat-mini">
          <span class="stat-mini-value" id="stat-cerradas">${sucursales.filter(s => !s.activa).length}</span>
          <span class="stat-mini-label">Cerradas</span>
        </div>
      </div>

      <!-- BODY: mapa + panel -->
      <div class="sucursales-body">
        <!-- MAPA -->
        <div class="mapa-card">
          <div class="mapa-card-header">
            <h4 class="mapa-card-title">
              🗺️ Mapa de Sucursales
              <span class="mapa-card-badge">OpenStreetMap</span>
            </h4>
          </div>
          <div id="map"></div>
          <div class="mapa-footer">
            🌐 Powered by <strong style="color: var(--text-secondary);">&nbsp;Leaflet</strong> &nbsp;+&nbsp; <strong style="color: var(--text-secondary);">OpenStreetMap</strong> &nbsp;· Sin API Key · Gratuito
          </div>
        </div>

        <!-- PANEL LATERAL -->
        <div class="sucursales-panel">
          <!-- Búsqueda -->
          <div class="panel-search">
            <svg class="panel-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              id="search-sucursales"
              class="panel-search-input"
              placeholder="Buscar sucursal..."
            />
          </div>

          <!-- Lista de sucursales -->
          <div class="sucursales-lista" id="sucursales-lista">
            <!-- Se llena con JS -->
          </div>
        </div>
      </div>
    </div>
  `;

  // Botones de admin (solo si es admin)
  const actionsContainer = container.querySelector('#sucursales-actions');
  if (isAdmin()) {
    actionsContainer.innerHTML = `
      <button id="btn-nueva-sucursal" style="
        display: inline-flex; align-items: center; gap: 6px;
        padding: 10px 18px; background: var(--color-primary);
        color: white; border: none; border-radius: var(--radius-lg);
        font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);
        font-family: var(--font-family); cursor: pointer;
        transition: all var(--transition-base);
      ">➕ Nueva Sucursal</button>
      <button id="btn-centrar-mapa" style="
        display: inline-flex; align-items: center; gap: 6px;
        padding: 10px 18px; background: var(--bg-secondary);
        color: var(--text-secondary); border: 1px solid var(--border-color);
        border-radius: var(--radius-lg); font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium); font-family: var(--font-family);
        cursor: pointer; transition: all var(--transition-base);
      ">🔄 Centrar Mapa</button>
    `;
    container.querySelector('#btn-nueva-sucursal').addEventListener('click', () => mostrarFormSucursal());
    container.querySelector('#btn-centrar-mapa').addEventListener('click', centrarMapa);
  } else {
    actionsContainer.innerHTML = `
      <button id="btn-centrar-mapa" style="
        display: inline-flex; align-items: center; gap: 6px;
        padding: 10px 18px; background: var(--bg-secondary);
        color: var(--text-secondary); border: 1px solid var(--border-color);
        border-radius: var(--radius-lg); font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium); font-family: var(--font-family);
        cursor: pointer; transition: all var(--transition-base);
      ">🔄 Centrar Mapa</button>
    `;
    container.querySelector('#btn-centrar-mapa').addEventListener('click', centrarMapa);
  }

  // Búsqueda
  container.querySelector('#search-sucursales').addEventListener('input', (e) => {
    filtrarSucursales(e.target.value);
  });

  // Renderizar lista
  renderLista();

  // Cargar Leaflet (async, desde CDN) y luego inicializar mapa
  cargarLeaflet().then(() => {
    // Pequeño delay para asegurar que el DOM del mapa ya tiene dimensiones en pantalla
    setTimeout(() => {
      inicializarMapa();
      renderMarcadores(sucursales);
      // Forzar re-cálculo de tamaño en caso de que el contenedor haya cambiado
      if (leafletMap) {
        leafletMap.invalidateSize();
      }
    }, 100);
  });
}

// =====================================================================
// LISTA DE SUCURSALES (panel lateral)
// =====================================================================
function renderLista() {
  const lista = document.querySelector('#sucursales-lista');
  if (!lista) return;

  lista.innerHTML = '';

  if (sucursalesFiltradas.length === 0) {
    lista.innerHTML = `
      <div class="sucursales-empty">
        <span class="sucursales-empty-icon">📍</span>
        <p class="sucursales-empty-text">No se encontraron sucursales</p>
      </div>
    `;
    return;
  }

  sucursalesFiltradas.forEach(s => {
    const card = crearTarjetaSucursal(s);
    lista.appendChild(card);
  });
}

function crearTarjetaSucursal(s) {
  const div = document.createElement('div');
  div.className = `sucursal-card${selectedMarkerId === s.id ? ' activa' : ''}`;
  div.dataset.id = s.id;

  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;

  div.innerHTML = `
    <div class="sucursal-card-top">
      <h4 class="sucursal-nombre">${s.nombre}</h4>
      <span class="sucursal-status ${s.activa ? 'abierta' : 'cerrada'}">
        <span class="sucursal-status-dot"></span>
        ${s.activa ? 'Abierta' : 'Cerrada'}
      </span>
    </div>
    <p class="sucursal-direccion">📍 ${s.direccion}</p>
    <div class="sucursal-card-actions">
      <a href="${gmapsUrl}" target="_blank" rel="noopener" class="btn-nav-maps">
        🧭 Abrir en Google Maps
      </a>
      <button class="btn-centrar" data-id="${s.id}">
        🎯 Ver en mapa
      </button>
      ${isAdmin() ? `
        <button class="btn-editar-suc" data-id="${s.id}" title="Editar" style="
          display:inline-flex; align-items:center; justify-content:center;
          width:32px; height:32px; background: var(--bg-hover);
          border: 1px solid var(--border-color); border-radius: var(--radius-md);
          color: var(--text-secondary); cursor: pointer; font-size: 14px;
          transition: all var(--transition-fast);
        ">✏️</button>
        <button class="btn-eliminar-suc" data-id="${s.id}" title="Eliminar" style="
          display:inline-flex; align-items:center; justify-content:center;
          width:32px; height:32px; background: hsla(4, 90%, 58%, 0.1);
          border: 1px solid hsla(4, 90%, 58%, 0.3); border-radius: var(--radius-md);
          color: var(--color-danger); cursor: pointer; font-size: 14px;
          transition: all var(--transition-fast);
        ">🗑️</button>
      ` : ''}
    </div>
  `;

  // Click en la card: centrar mapa
  div.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;
    centrarEnSucursal(s);
  });

  // Botón centrar
  div.querySelector('.btn-centrar').addEventListener('click', () => centrarEnSucursal(s));

  // Botones admin
  if (isAdmin()) {
    div.querySelector('.btn-editar-suc').addEventListener('click', () => mostrarFormSucursal(s));
    div.querySelector('.btn-eliminar-suc').addEventListener('click', () => confirmarEliminar(s));
  }

  return div;
}

// =====================================================================
// MAPA LEAFLET
// =====================================================================
function cargarLeaflet() {
  // Si ya está cargado y disponible, resolver inmediatamente
  if (leafletLoaded && window.L) return Promise.resolve();

  return new Promise((resolve, reject) => {
    // CSS de Leaflet
    if (!document.querySelector('#leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // JS de Leaflet
    if (!document.querySelector('#leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        leafletLoaded = true;
        resolve();
      };
      script.onerror = () => {
        console.error('Error cargando Leaflet desde CDN');
        reject(new Error('No se pudo cargar Leaflet'));
      };
      document.head.appendChild(script);
    } else {
      // El script ya existe en el DOM
      if (window.L) {
        leafletLoaded = true;
        resolve();
      } else {
        // El script existe pero aún no terminó de cargar, esperar
        const existing = document.querySelector('#leaflet-js');
        existing.addEventListener('load', () => { leafletLoaded = true; resolve(); });
        existing.addEventListener('error', reject);
      }
    }
  });
}

function inicializarMapa() {
  const mapEl = document.querySelector('#map');
  if (!mapEl || !window.L) return;

  // Destruir instancia previa si existe
  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }

  leafletMap = window.L.map('map', {
    center: [19.0413, -98.2062], // Puebla, México
    zoom: 12,
    zoomControl: true,
    scrollWheelZoom: true
  });

  // Tile layer: OpenStreetMap (100% gratuito, sin API key)
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    minZoom: 10
  }).addTo(leafletMap);
}

function renderMarcadores(lista) {
  if (!window.L || !leafletMap) return;

  // Limpiar marcadores anteriores
  Object.values(markersMap).forEach(m => {
    leafletMap.removeLayer(m);
  });
  Object.keys(markersMap).forEach(k => delete markersMap[k]);

  if (lista.length === 0) return;

  lista.forEach(s => {
    const iconColor = s.activa ? '#22c55e' : '#ef4444';
    const svgIcon = crearIconoSVG(iconColor);

    const marker = window.L.marker([s.lat, s.lng], { icon: svgIcon });

    // Popup
    const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;
    const popupHtml = `
      <div class="popup-content">
        <p class="popup-titulo">🏪 ${s.nombre}</p>
        <p class="popup-direccion">📍 ${s.direccion}</p>
        ${s.horario ? `<p class="popup-horario">🕐 ${s.horario}</p>` : ''}
        <a href="${gmapsUrl}" target="_blank" rel="noopener" class="popup-btn-gmaps">
          🧭 Abrir en Google Maps
        </a>
      </div>
    `;

    marker.bindPopup(popupHtml, { maxWidth: 280, minWidth: 230 });

    marker.on('click', () => {
      selectedMarkerId = s.id;
      actualizarCardActiva(s.id);
    });

    marker.addTo(leafletMap);
    markersMap[s.id] = marker;
  });
}

function crearIconoSVG(color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.4)"/>
        </filter>
      </defs>
      <path d="M16 0C7.163 0 0 7.163 0 16c0 10.784 14.4 24.8 15.02 25.386a1.33 1.33 0 0 0 1.96 0C17.6 40.8 32 26.784 32 16 32 7.163 24.837 0 16 0z"
        fill="${color}" filter="url(#shadow)"/>
      <circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/>
    </svg>
  `;
  return window.L.divIcon({
    html: svg,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -40],
    className: ''
  });
}

function centrarEnSucursal(s) {
  if (!leafletMap) return;
  selectedMarkerId = s.id;
  actualizarCardActiva(s.id);
  leafletMap.flyTo([s.lat, s.lng], 15, { animate: true, duration: 0.8 });
  if (markersMap[s.id]) {
    setTimeout(() => markersMap[s.id].openPopup(), 900);
  }
}

function centrarMapa() {
  if (!leafletMap) return;
  leafletMap.flyTo([19.0413, -98.2062], 12, { animate: true, duration: 0.8 });
  selectedMarkerId = null;
  actualizarCardActiva(null);
}

function actualizarCardActiva(id) {
  document.querySelectorAll('.sucursal-card').forEach(card => {
    if (String(card.dataset.id) === String(id)) {
      card.classList.add('activa');
    } else {
      card.classList.remove('activa');
    }
  });
}

// =====================================================================
// FILTRO DE BÚSQUEDA
// =====================================================================
function filtrarSucursales(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    sucursalesFiltradas = [...sucursales];
  } else {
    sucursalesFiltradas = sucursales.filter(s =>
      s.nombre.toLowerCase().includes(q) ||
      s.direccion.toLowerCase().includes(q)
    );
  }
  renderLista();
  renderMarcadores(sucursalesFiltradas);
}

// =====================================================================
// CRUD LOCAL (localStorage) — No toca la BD backend
// =====================================================================
function cargarSucursales() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error cargando sucursales del storage:', e);
  }
  // Primera vez: usar demo y guardar
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SUCURSALES_DEMO));
  return [...SUCURSALES_DEMO];
}

function guardarSucursales(lista) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  } catch (e) {
    console.error('Error guardando sucursales:', e);
  }
}

function actualizarEstadisticas() {
  const total = document.querySelector('#stat-total');
  const abiertas = document.querySelector('#stat-abiertas');
  const cerradas = document.querySelector('#stat-cerradas');
  if (total) total.textContent = sucursales.length;
  if (abiertas) abiertas.textContent = sucursales.filter(s => s.activa).length;
  if (cerradas) cerradas.textContent = sucursales.filter(s => !s.activa).length;
}

// =====================================================================
// FORMULARIO NUEVA/EDITAR SUCURSAL — con mini mapa interactivo
// =====================================================================
function mostrarFormSucursal(sucursal = null) {
  const esEdicion = !!sucursal;
  const title = esEdicion ? '✏️ Editar Sucursal' : '➕ Nueva Sucursal';
  const initLat = sucursal?.lat || 19.0413;
  const initLng = sucursal?.lng || -98.2062;

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
    z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 16px;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: var(--bg-secondary); border: 1px solid var(--border-color);
    border-radius: var(--radius-xl); padding: 24px; width: 100%; max-width: 560px;
    box-shadow: var(--shadow-xl); animation: slideUp 0.2s ease;
    max-height: 92vh; overflow-y: auto;
  `;

  // Construimos el HTML del modal evitando template literals con backticks anidados
  const checkAttr = (sucursal && sucursal.activa === false) ? '' : 'checked';
  const latDisplay = (initLat).toFixed(6);
  const lngDisplay = (initLng).toFixed(6);
  const nombreVal = sucursal ? sucursal.nombre : '';
  const dirVal = sucursal ? sucursal.direccion : '';
  const telVal = sucursal ? sucursal.telefono : '';
  const horVal = sucursal ? sucursal.horario : '';
  const btnLabel = esEdicion ? 'Guardar Cambios' : 'Crear Sucursal';

  modal.innerHTML =
    '<style>' +
    '@keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }' +
    '@keyframes spin { to { transform:rotate(360deg); } }' +
    '.mfl { display:block; font-size:13px; font-weight:600; color:var(--text-secondary); margin-bottom:6px; }' +
    '.mfi { width:100%; padding:10px 14px; background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:var(--radius-md); color:var(--text-primary); font-size:14px; font-family:var(--font-family); transition:all 0.2s; box-sizing:border-box; }' +
    '.mfi:focus { outline:none; border-color:var(--color-primary); box-shadow:0 0 0 3px rgba(59,130,246,0.15); }' +
    '.mchk { display:flex; align-items:center; gap:8px; cursor:pointer; }' +
    '.mchk input { width:18px; height:18px; accent-color:var(--color-primary); cursor:pointer; }' +
    '.geo-wrap { position:relative; display:flex; gap:8px; }' +
    '.geo-in { flex:1; padding:10px 14px 10px 36px; background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:var(--radius-md); color:var(--text-primary); font-size:14px; font-family:var(--font-family); box-sizing:border-box; transition:all 0.2s; }' +
    '.geo-in:focus { outline:none; border-color:var(--color-primary); box-shadow:0 0 0 3px rgba(59,130,246,0.15); }' +
    '.geo-ico { position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--text-tertiary); pointer-events:none; }' +
    '.geo-btn { padding:10px 12px; background:var(--color-primary); border:none; border-radius:var(--radius-md); color:white; font-size:13px; font-weight:600; font-family:var(--font-family); cursor:pointer; white-space:nowrap; transition:filter 0.2s; }' +
    '.geo-btn:hover { filter:brightness(1.15); } .geo-btn:disabled { opacity:0.6; cursor:not-allowed; }' +
    '.geo-res { position:absolute; top:calc(100% + 4px); left:0; right:0; background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:var(--radius-md); z-index:9010; max-height:190px; overflow-y:auto; box-shadow:var(--shadow-lg); display:none; }' +
    '.geo-item { padding:10px 14px; font-size:13px; color:var(--text-primary); cursor:pointer; border-bottom:1px solid var(--border-color); transition:background 0.15s; line-height:1.4; font-family:var(--font-family); }' +
    '.geo-item:last-child { border-bottom:none; } .geo-item:hover { background:var(--bg-hover); }' +
    '.geo-empty { padding:10px 14px; font-size:13px; color:var(--text-tertiary); font-family:var(--font-family); }' +
    '.mmh { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }' +
    '#modal-map { width:100%; height:230px; border-radius:var(--radius-md); border:1px solid var(--border-color); position:relative; overflow:hidden; }' +
    '.btn-gloc { display:inline-flex; align-items:center; gap:5px; padding:7px 11px; background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:var(--radius-md); color:var(--text-secondary); font-size:12px; font-family:var(--font-family); cursor:pointer; transition:all 0.2s; white-space:nowrap; flex-shrink:0; }' +
    '.btn-gloc:hover { background:var(--color-primary); color:white; border-color:var(--color-primary); } .btn-gloc:disabled { opacity:0.5; cursor:not-allowed; }' +
    '.crd-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }' +
    '.crd-box { background:var(--bg-primary); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:8px 12px; }' +
    '.crd-lbl { font-size:10px; color:var(--text-tertiary); font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px; }' +
    '.crd-val { font-size:13px; color:var(--color-primary); font-weight:700; font-family:monospace; }' +
    '</style>' +

    // Header
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">' +
    '<h3 style="margin:0;font-size:18px;font-weight:700;color:var(--text-primary);">' + title + '</h3>' +
    '<button id="modal-close" style="background:none;border:none;color:var(--text-secondary);font-size:22px;cursor:pointer;line-height:1;">✕</button>' +
    '</div>' +

    // Nombre
    '<div style="margin-bottom:14px;">' +
    '<label class="mfl">Nombre de la sucursal *</label>' +
    '<input id="f-nombre" class="mfi" type="text" value="' + nombreVal + '" placeholder="Ej: Sucursal Centro" />' +
    '</div>' +

    // Buscador
    '<div style="margin-bottom:12px;">' +
    '<label class="mfl">🔍 Buscar dirección en el mapa</label>' +
    '<div style="position:relative;">' +
    '<div class="geo-wrap">' +
    '<svg class="geo-ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
    '<input id="geo-input" class="geo-in" type="text" placeholder="Ej: Av. Reforma, Puebla, México" autocomplete="off" />' +
    '<button id="geo-btn" class="geo-btn">Buscar</button>' +
    '</div>' +
    '</div>' +
    '</div>' +

    // Mini mapa
    '<div style="margin-bottom:12px;">' +
    '<div class="mmh">' +
    '<label class="mfl" style="margin:0;">📍 Arrastra el pin para ajustar la posición exacta</label>' +
    '<button id="btn-gloc" class="btn-gloc">' +
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>' +
    ' Mi ubicación' +
    '</button>' +
    '</div>' +
    '<div id="modal-map"></div>' +
    '</div>' +

    // Coordenadas (solo lectura)
    '<div class="crd-row">' +
    '<div class="crd-box"><div class="crd-lbl">Latitud</div><div class="crd-val" id="disp-lat">' + latDisplay + '</div></div>' +
    '<div class="crd-box"><div class="crd-lbl">Longitud</div><div class="crd-val" id="disp-lng">' + lngDisplay + '</div></div>' +
    '</div>' +
    '<input id="f-lat" type="hidden" value="' + initLat + '" />' +
    '<input id="f-lng" type="hidden" value="' + initLng + '" />' +

    // Dirección
    '<div style="margin-bottom:14px;">' +
    '<label class="mfl">Dirección *</label>' +
    '<input id="f-direccion" class="mfi" type="text" value="' + dirVal + '" placeholder="Se llena al buscar, o escribe manualmente" />' +
    '</div>' +

    // Teléfono + Horario
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">' +
    '<div><label class="mfl">Teléfono</label><input id="f-telefono" class="mfi" type="tel" value="' + telVal + '" placeholder="222 000 0000" /></div>' +
    '<div><label class="mfl">Horario</label><input id="f-horario" class="mfi" type="text" value="' + horVal + '" placeholder="Lun–Vie 9:00–20:00" /></div>' +
    '</div>' +

    // Estado
    '<div style="margin-bottom:22px;">' +
    '<label class="mchk"><input id="f-activa" type="checkbox" ' + checkAttr + ' /><span style="color:var(--text-primary);font-size:14px;">Sucursal activa (abierta)</span></label>' +
    '</div>' +

    // Botones
    '<div style="display:flex;gap:12px;justify-content:flex-end;">' +
    '<button id="modal-cancel" style="padding:10px 20px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:var(--radius-lg);color:var(--text-secondary);font-family:var(--font-family);font-size:14px;cursor:pointer;">Cancelar</button>' +
    '<button id="modal-save" style="padding:10px 24px;background:var(--color-primary);border:none;border-radius:var(--radius-lg);color:white;font-family:var(--font-family);font-size:14px;font-weight:600;cursor:pointer;">' + btnLabel + '</button>' +
    '</div>';

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // ── Dropdown geocoder como portal en document.body ─────────────────
  const gResults = document.createElement('div');
  gResults.id = 'geo-results-portal';
  gResults.style.cssText = [
    'position:fixed',
    'z-index:9999',
    'background:var(--bg-tertiary)',
    'border:1px solid var(--border-color)',
    'border-radius:var(--radius-md)',
    'max-height:200px',
    'overflow-y:auto',
    'box-shadow:var(--shadow-lg)',
    'display:none',
    'font-family:var(--font-family)'
  ].join(';');
  document.body.appendChild(gResults);

  function posicionarDropdown() {
    const rect = overlay.querySelector('#geo-input').getBoundingClientRect();
    gResults.style.top = (rect.bottom + 4) + 'px';
    gResults.style.left = rect.left + 'px';
    gResults.style.width = rect.width + 'px';
  }

  // ── Mini mapa ──────────────────────────────────────────────────────
  let modalMap = null;
  let modalMarker = null;
  let isMounted = true;

  function setCoords(lat, lng) {
    overlay.querySelector('#f-lat').value = lat;
    overlay.querySelector('#f-lng').value = lng;
    overlay.querySelector('#disp-lat').textContent = lat.toFixed(6);
    overlay.querySelector('#disp-lng').textContent = lng.toFixed(6);
  }

  setTimeout(() => {
    if (!isMounted) return; // modal cerrado antes de inicializar
    if (!window.L) { console.error('Leaflet no está cargado'); return; }
    modalMap = window.L.map('modal-map', {
      center: [initLat, initLng],
      zoom: 15,
      zoomControl: true,
      scrollWheelZoom: false
    });
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(modalMap);

    modalMarker = window.L.marker([initLat, initLng], {
      draggable: true,
      icon: crearIconoSVG('#667eea')
    }).addTo(modalMap);

    modalMarker.on('dragend', () => {
      const p = modalMarker.getLatLng();
      setCoords(p.lat, p.lng);
      reverseGeocode(p.lat, p.lng);
    });

    modalMap.invalidateSize();
  }, 200);

  // ── Reverse geocoding (dirección desde coords) ─────────────────────
  async function reverseGeocode(lat, lng) {
    try {
      const r = await fetch(
        'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng + '&accept-language=es'
      );
      const d = await r.json();
      if (d && d.display_name) {
        const short = d.display_name.split(',').slice(0, 4).join(',').trim();
        overlay.querySelector('#f-direccion').value = short;
      }
    } catch (e) { /* fallo silencioso */ }
  }

  // ── Geocoder (buscar dirección → coords) ──────────────────────────
  const gInput = overlay.querySelector('#geo-input');
  const gBtn = overlay.querySelector('#geo-btn');

  async function buscar() {
    const q = gInput.value.trim();
    if (!q) return;
    gBtn.disabled = true;
    gBtn.textContent = '⏳';
    gResults.style.display = 'none';
    gResults.innerHTML = '';

    try {
      const url = 'https://nominatim.openstreetmap.org/search?format=json&q=' +
        encodeURIComponent(q) + '&limit=5&accept-language=es';
      const r = await fetch(url);
      const data = await r.json();

      if (!data || !data.length) {
        gResults.innerHTML = '<div class="geo-empty">Sin resultados. Intenta con más detalles.</div>';
      } else {
        data.forEach(item => {
          const div = document.createElement('div');
          div.className = 'geo-item';
          div.textContent = item.display_name;
          div.addEventListener('click', () => {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            modalMap.flyTo([lat, lng], 16, { animate: true, duration: 0.6 });
            modalMarker.setLatLng([lat, lng]);
            setCoords(lat, lng);
            const short = item.display_name.split(',').slice(0, 4).join(',').trim();
            overlay.querySelector('#f-direccion').value = short;
            gResults.style.display = 'none';
            gInput.value = '';
          });
          gResults.appendChild(div);
        });
      }
      posicionarDropdown();
      gResults.style.display = 'block';
    } catch (e) {
      gResults.innerHTML = '<div class="geo-empty">⚠️ Error de red. Verifica tu conexión.</div>';
      gResults.style.display = 'block';
    } finally {
      gBtn.disabled = false;
      gBtn.textContent = 'Buscar';
    }
  }

  gInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); buscar(); } });
  gBtn.addEventListener('click', buscar);

  // Cerrar dropdown al hacer click fuera
  document.addEventListener('click', function cerrarDropdown(e) {
    if (!gResults.contains(e.target) && e.target !== gBtn && e.target !== gInput) {
      gResults.style.display = 'none';
    }
  }, { once: false, capture: true });
  // Guardar ref para limpieza posterior
  overlay._cerrarDropdownListener = function (e) {
    if (!gResults.contains(e.target) && e.target !== gBtn && e.target !== gInput) {
      gResults.style.display = 'none';
    }
  };
  document.addEventListener('click', overlay._cerrarDropdownListener, true);

  // ── Botón Mi Ubicación ─────────────────────────────────────────────
  const btnGloc = overlay.querySelector('#btn-gloc');
  const glocIcon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>';

  btnGloc.addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert('⚠️ Tu navegador no soporta geolocalización.');
      return;
    }
    btnGloc.disabled = true;
    btnGloc.textContent = '⏳ Localizando...';

    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        modalMap.flyTo([lat, lng], 17, { animate: true, duration: 0.8 });
        modalMarker.setLatLng([lat, lng]);
        setCoords(lat, lng);
        reverseGeocode(lat, lng);
        btnGloc.disabled = false;
        btnGloc.innerHTML = glocIcon + ' Mi ubicación';
      },
      () => {
        alert('⚠️ No se pudo obtener tu ubicación. Verifica los permisos del navegador.');
        btnGloc.disabled = false;
        btnGloc.innerHTML = glocIcon + ' Mi ubicación';
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });

  // ── Cerrar modal ───────────────────────────────────────────────────
  const cerrar = () => {
    if (modalMap) { modalMap.remove(); modalMap = null; }
    overlay.remove();
  };
  overlay.querySelector('#modal-close').addEventListener('click', cerrar);
  overlay.querySelector('#modal-cancel').addEventListener('click', cerrar);
  overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(); });

  // ── Guardar ────────────────────────────────────────────────────────
  overlay.querySelector('#modal-save').addEventListener('click', () => {
    const nombre = overlay.querySelector('#f-nombre').value.trim();
    const lat = parseFloat(overlay.querySelector('#f-lat').value);
    const lng = parseFloat(overlay.querySelector('#f-lng').value);
    const direccion = overlay.querySelector('#f-direccion').value.trim();
    const telefono = overlay.querySelector('#f-telefono').value.trim();
    const horario = overlay.querySelector('#f-horario').value.trim();
    const activa = overlay.querySelector('#f-activa').checked;

    if (!nombre || !direccion || isNaN(lat) || isNaN(lng)) {
      alert('⚠️ Por favor completa: Nombre, Dirección y posiciona el pin en el mapa.');
      return;
    }

    if (esEdicion) {
      const idx = sucursales.findIndex(s => s.id === sucursal.id);
      if (idx !== -1) {
        sucursales[idx] = { ...sucursales[idx], nombre, lat, lng, direccion, telefono, horario, activa };
      }
    } else {
      sucursales.push({ id: Date.now(), nombre, lat, lng, direccion, telefono, horario, activa });
    }

    guardarSucursales(sucursales);
    sucursalesFiltradas = [...sucursales];
    renderLista();
    renderMarcadores(sucursales);
    actualizarEstadisticas();
    cerrar();
  });
}

// =====================================================================
// ELIMINAR SUCURSAL
// =====================================================================
function confirmarEliminar(s) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
    z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 16px;
  `;

  overlay.innerHTML =
    '<div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-xl);padding:28px;width:100%;max-width:380px;box-shadow:var(--shadow-xl);text-align:center;">' +
    '<div style="font-size:3rem;margin-bottom:12px;">⚠️</div>' +
    '<h3 style="margin:0 0 8px;color:var(--text-primary);">Eliminar Sucursal</h3>' +
    '<p style="color:var(--text-secondary);font-size:14px;margin-bottom:24px;line-height:1.5;">' +
    '¿Estás seguro de eliminar <strong style="color:var(--text-primary);">' + s.nombre + '</strong>?<br>Esta acción no se puede deshacer.' +
    '</p>' +
    '<div style="display:flex;gap:12px;justify-content:center;">' +
    '<button id="del-cancel" style="padding:10px 24px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:var(--radius-lg);color:var(--text-secondary);font-family:var(--font-family);font-size:14px;cursor:pointer;">Cancelar</button>' +
    '<button id="del-confirm" style="padding:10px 24px;background:var(--color-danger);border:none;border-radius:var(--radius-lg);color:white;font-family:var(--font-family);font-size:14px;font-weight:600;cursor:pointer;">🗑️ Eliminar</button>' +
    '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  overlay.querySelector('#del-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#del-confirm').addEventListener('click', () => {
    sucursales = sucursales.filter(x => x.id !== s.id);
    guardarSucursales(sucursales);
    sucursalesFiltradas = [...sucursales];
    renderLista();
    renderMarcadores(sucursales);
    actualizarEstadisticas();
    overlay.remove();
  });
}

// =====================================================================
// CLEANUP AL SALIR DEL MÓDULO
// =====================================================================
export function cleanupSucursales() {
  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }
  Object.keys(markersMap).forEach(k => delete markersMap[k]);
  selectedMarkerId = null;
  sucursales = [];
  sucursalesFiltradas = [];
}
