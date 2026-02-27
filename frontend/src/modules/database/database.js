// database.js - Módulo de gestión de base de datos (solo admin)
import './database.css';

export function renderDatabase(container) {
  container.innerHTML = `
    <div class="database-container">
      <div class="database-header">
        <h3>🗄️ Gestión de Base de Datos</h3>
        <button class="btn-refresh" id="refresh-stats">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Actualizar
        </button>
      </div>

      <div class="stats-grid" id="db-stats">
        <div class="stat-card">
          <div class="stat-label">Usuarios Activos</div>
          <div class="stat-value" id="stat-usuarios">-</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Productos</div>
          <div class="stat-value" id="stat-productos">-</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Ventas Totales</div>
          <div class="stat-value" id="stat-ventas">-</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Tamaño BD</div>
          <div class="stat-value" id="stat-size">-</div>
        </div>
      </div>

      <div class="tables-section">
        <h4>📊 Tablas de la Base de Datos</h4>
        <div class="tables-grid" id="tables-list">
          <div class="loading">Cargando tablas...</div>
        </div>
      </div>

      <div class="query-section">
        <h4>🔍 Consultas SQL (Solo SELECT)</h4>
        <div class="query-form">
          <textarea 
            id="sql-query" 
            placeholder="SELECT * FROM productos LIMIT 10"
            rows="4"
          ></textarea>
          <button class="btn-execute" id="execute-query">
            ▶ Ejecutar Consulta
          </button>
        </div>
        <div class="query-results" id="query-results"></div>
      </div>
    </div>
  `;

  // Cargar estadísticas
  loadStats();

  // Cargar tablas
  loadTables();

  // Event listeners
  document.getElementById('refresh-stats').addEventListener('click', loadStats);
  document.getElementById('execute-query').addEventListener('click', executeQuery);
}

async function loadStats() {
  try {
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    const response = await fetch('http://localhost:3000/api/database/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.stats) {
      document.getElementById('stat-usuarios').textContent = data.stats.usuarios;
      document.getElementById('stat-productos').textContent = data.stats.productos;
      document.getElementById('stat-ventas').textContent = data.stats.ventas;
      document.getElementById('stat-size').textContent = data.stats.databaseSize.toFixed(2) + ' MB';
    }
  } catch (error) {
    console.error('Error al cargar estadísticas:', error);
  }
}

async function loadTables() {
  try {
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    const response = await fetch('http://localhost:3000/api/database/tables', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    const container = document.getElementById('tables-list');

    if (data.tables && data.tables.length > 0) {
      container.innerHTML = data.tables.map(table => `
        <div class="table-card" data-table="${table}">
          <div class="table-icon">📋</div>
          <div class="table-name">${table}</div>
          <button class="btn-view" data-table="${table}">Ver Datos</button>
        </div>
      `).join('');

      // Agregar event listeners a los botones
      container.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', () => viewTableData(btn.dataset.table));
      });
    } else {
      container.innerHTML = `
        <div class="no-tables">
          <div class="init-icon">⚠️</div>
          <p>No se encontraron tablas en la base de datos.</p>
          <p><small>Asegúrate de que la base de datos <strong>tienda_manager</strong> esté creada y contenga las tablas.</small></p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error al cargar tablas:', error);
    document.getElementById('tables-list').innerHTML =
      '<div class="error">Error al conectar con el servidor</div>';
  }
}

async function viewTableData(tableName) {
  try {
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    const response = await fetch(`http://localhost:3000/api/database/tables/${tableName}/data?limit=20`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();
    const resultsContainer = document.getElementById('query-results');

    if (result.data && result.data.length > 0) {
      const columns = Object.keys(result.data[0]);

      let html = `
        <div class="results-header">
          <h5>Tabla: ${tableName} (${result.total} registros, mostrando ${result.data.length})</h5>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${result.data.map(row => `
                <tr>
                  ${columns.map(col => `<td>${row[col] !== null ? row[col] : '<em>null</em>'}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      resultsContainer.innerHTML = html;
    } else {
      resultsContainer.innerHTML = '<div class="no-data">No hay datos en esta tabla</div>';
    }
  } catch (error) {
    console.error('Error al ver datos:', error);
  }
}

async function executeQuery() {
  const query = document.getElementById('sql-query').value.trim();
  const resultsContainer = document.getElementById('query-results');

  if (!query) {
    resultsContainer.innerHTML = '<div class="error">Ingresa una consulta SQL</div>';
    return;
  }

  try {
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    const response = await fetch('http://localhost:3000/api/database/query', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    const result = await response.json();

    if (result.error) {
      resultsContainer.innerHTML = `<div class="error">❌ ${result.error}</div>`;
      return;
    }

    if (result.results && result.results.length > 0) {
      const columns = Object.keys(result.results[0]);

      let html = `
        <div class="results-header">
          <h5>✅ Consulta ejecutada exitosamente (${result.results.length} resultados)</h5>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${result.results.map(row => `
                <tr>
                  ${columns.map(col => `<td>${row[col] !== null ? row[col] : '<em>null</em>'}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      resultsContainer.innerHTML = html;
    } else {
      resultsContainer.innerHTML = '<div class="success">✅ Consulta ejecutada (sin resultados)</div>';
    }
  } catch (error) {
    console.error('Error al ejecutar consulta:', error);
    resultsContainer.innerHTML = `<div class="error">❌ Error: ${error.message}</div>`;
  }
}

export function cleanupDatabase() {
  // No hay event listeners globales que limpiar
}
