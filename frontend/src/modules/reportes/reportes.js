// reportes.js - Módulo de reportes y estadísticas
import './reportes.css';
import { createStatCard } from '../../components/Card.js';
import { createLineChart } from './Chart.js';
import { formatCurrency, formatDateTime } from '../../utils/formatters.js';
import {
    obtenerResumenGeneral,
    obtenerProductosMasVendidos
} from '../../services/reportesService.js';
import { obtenerVentasHoy } from '../../services/ventasService.js';

let chartVentas = null;

// Renderizar vista de reportes
export async function renderReportes(container) {
    container.innerHTML = '';
    container.className = 'app-content';

    const reportesContainer = document.createElement('div');
    reportesContainer.className = 'reportes-container';

    // Mostrar loading
    reportesContainer.innerHTML = `
    <div style="text-align: center; padding: var(--spacing-16); color: var(--text-secondary);">
      <div style="font-size: 48px; margin-bottom: var(--spacing-4);">📊</div>
      <p>Cargando estadísticas...</p>
    </div>
  `;

    container.appendChild(reportesContainer);

    // Cargar datos
    const resumen = await obtenerResumenGeneral();

    if (!resumen) {
        reportesContainer.innerHTML = `
      <div style="text-align: center; padding: var(--spacing-16); color: var(--text-secondary);">
        <p>Error al cargar reportes</p>
      </div>
    `;
        return;
    }

    reportesContainer.innerHTML = '';

    // Estadísticas principales
    const statsGrid = crearStatsGrid(resumen.hoy);
    reportesContainer.appendChild(statsGrid);

    // Gráficas
    const chartsSection = crearChartsSection(resumen);
    reportesContainer.appendChild(chartsSection);

    // Historial de ventas
    const historialSection = await crearHistorialSection();
    reportesContainer.appendChild(historialSection);
}

// Crear grid de estadísticas
function crearStatsGrid(estadisticas) {
    const grid = document.createElement('div');
    grid.className = 'reportes-stats';

    // Total ventas
    const statVentas = createStatCard({
        title: 'Ventas de Hoy',
        value: estadisticas.totalVentas.toString(),
        icon: '🛒',
        variant: 'default'
    });

    // Total ingresos
    const statIngresos = createStatCard({
        title: 'Ingresos de Hoy',
        value: formatCurrency(estadisticas.totalIngresos),
        icon: '💰',
        variant: 'success'
    });

    // Promedio por venta
    const statPromedio = createStatCard({
        title: 'Promedio por Venta',
        value: formatCurrency(estadisticas.promedioVenta),
        icon: '📈',
        variant: 'primary'
    });

    // Productos vendidos
    const totalProductos = Object.values(estadisticas.productosVendidos)
        .reduce((sum, cant) => sum + cant, 0);

    const statProductos = createStatCard({
        title: 'Productos Vendidos',
        value: totalProductos.toString(),
        icon: '📦',
        variant: 'default'
    });

    grid.appendChild(statVentas);
    grid.appendChild(statIngresos);
    grid.appendChild(statPromedio);
    grid.appendChild(statProductos);

    return grid;
}

// Crear sección de gráficas
function crearChartsSection(resumen) {
    const section = document.createElement('div');
    section.className = 'reportes-charts';

    // Gráfica de ventas semanales
    const chartVentasContainer = document.createElement('div');
    chartVentasContainer.className = 'chart-container';
    chartVentasContainer.innerHTML = `
    <h3 class="chart-title">Ventas Últimos 7 Días</h3>
    <canvas id="chart-ventas-semana" style="max-height: 250px;"></canvas>
  `;

    // Top productos
    const topProductosContainer = document.createElement('div');
    topProductosContainer.className = 'chart-container';
    topProductosContainer.innerHTML = `
    <h3 class="chart-title">🏆 Top Productos</h3>
    <div class="top-productos-list" id="top-productos-list"></div>
  `;

    section.appendChild(chartVentasContainer);
    section.appendChild(topProductosContainer);

    // Renderizar gráfica después de que esté en el DOM
    setTimeout(() => {
        const canvas = document.getElementById('chart-ventas-semana');
        if (canvas && resumen.semana.labels.length > 0) {
            if (chartVentas) chartVentas.destroy();
            chartVentas = createLineChart(canvas, {
                labels: resumen.semana.labels,
                datos: resumen.semana.datos,
                label: 'Ventas'
            });
        }

        // Renderizar top productos
        renderTopProductos(resumen.topProductos);
    }, 100);

    return section;
}

// Renderizar top productos
function renderTopProductos(topProductos) {
    const container = document.querySelector('#top-productos-list');
    if (!container) return;

    container.innerHTML = '';

    if (topProductos.length === 0) {
        container.innerHTML = `
      <div style="text-align: center; padding: var(--spacing-4); color: var(--text-tertiary);">
        <p>No hay datos disponibles</p>
      </div>
    `;
        return;
    }

    topProductos.forEach((producto, index) => {
        const item = document.createElement('div');
        item.className = 'top-producto-item';
        item.innerHTML = `
      <div class="top-producto-rank">${index + 1}</div>
      <div class="top-producto-info">
        <div class="top-producto-nombre">${producto.nombre}</div>
        <div class="top-producto-cantidad">${producto.cantidad} vendidos</div>
      </div>
      <div class="top-producto-ingresos">${formatCurrency(producto.ingresos)}</div>
    `;
        container.appendChild(item);
    });
}

// Crear sección de historial
async function crearHistorialSection() {
    const section = document.createElement('div');
    section.className = 'reportes-tabla';

    section.innerHTML = `
    <div class="tabla-header">
      <h3 class="tabla-title">📋 Historial de Ventas de Hoy</h3>
    </div>
    <div class="tabla-content">
      <table class="tabla">
        <thead>
          <tr>
            <th>Hora</th>
            <th>Items</th>
            <th>Total</th>
            <th>Productos</th>
          </tr>
        </thead>
        <tbody id="tabla-ventas-body">
          <tr>
            <td colspan="4" style="text-align: center; padding: var(--spacing-6); color: var(--text-tertiary);">
              Cargando...
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

    // Cargar ventas de hoy
    const ventas = await obtenerVentasHoy();
    const tbody = section.querySelector('#tabla-ventas-body');

    if (ventas.length === 0) {
        tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: var(--spacing-6); color: var(--text-tertiary);">
          No hay ventas registradas hoy
        </td>
      </tr>
    `;
    } else {
        tbody.innerHTML = '';
        ventas.forEach(venta => {
            const row = document.createElement('tr');
            const hora = venta.fecha ? formatDateTime(venta.fecha).split(',')[1] : '-';
            const cantidadItems = venta.items?.reduce((sum, item) => sum + item.cantidad, 0) || 0;
            const productos = venta.items?.map(item => item.nombre).join(', ') || '-';

            row.innerHTML = `
        <td>${hora}</td>
        <td>${cantidadItems}</td>
        <td><strong>${formatCurrency(venta.total)}</strong></td>
        <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${productos}
        </td>
      `;
            tbody.appendChild(row);
        });
    }

    return section;
}

// Cleanup
export function cleanupReportes() {
    if (chartVentas) {
        chartVentas.destroy();
        chartVentas = null;
    }
}
