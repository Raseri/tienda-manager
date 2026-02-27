// Card.js - Componente de tarjeta reutilizable

export function createCard({ title, content, footer = null, variant = 'default' }) {
    const card = document.createElement('div');
    card.className = `card card-${variant}`;

    if (title) {
        const header = document.createElement('div');
        header.className = 'card-header';

        if (typeof title === 'string') {
            header.innerHTML = `<h3 class="card-title">${title}</h3>`;
        } else {
            header.appendChild(title);
        }

        card.appendChild(header);
    }

    const body = document.createElement('div');
    body.className = 'card-body';

    if (typeof content === 'string') {
        body.innerHTML = content;
    } else {
        body.appendChild(content);
    }

    card.appendChild(body);

    if (footer) {
        const footerEl = document.createElement('div');
        footerEl.className = 'card-footer';

        if (typeof footer === 'string') {
            footerEl.innerHTML = footer;
        } else {
            footerEl.appendChild(footer);
        }

        card.appendChild(footerEl);
    }

    return card;
}

export function createStatCard({ title, value, icon, trend = null, variant = 'default' }) {
    const content = document.createElement('div');
    content.className = 'stat-card-content';

    content.innerHTML = `
    <div class="stat-header">
      <div class="stat-info">
        <div class="stat-label">${title}</div>
        <div class="stat-value">${value}</div>
      </div>
      ${icon ? `<div class="stat-icon">${icon}</div>` : ''}
    </div>
    ${trend ? `
      <div class="stat-trend ${trend.direction}">
        <span class="trend-icon">${trend.direction === 'up' ? '↑' : '↓'}</span>
        <span>${trend.value}</span>
      </div>
    ` : ''}
  `;

    return createCard({ content, variant });
}

// Estilos de Card
const style = document.createElement('style');
style.textContent = `
  .card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: all var(--transition-base);
  }
  
  .card:hover {
    border-color: var(--border-color-light);
    box-shadow: var(--shadow-md);
  }
  
  .card-header {
    padding: var(--spacing-5);
    border-bottom: 1px solid var(--border-color);
  }
  
  .card-title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
  }
  
  .card-body {
    padding: var(--spacing-5);
  }
  
  .card-footer {
    padding: var(--spacing-4) var(--spacing-5);
    background: var(--bg-tertiary);
    border-top: 1px solid var(--border-color);
  }
  
  /* Variantes de card */
  .card-primary {
    border-color: var(--color-primary);
  }
  
  .card-success {
    border-color: var(--color-success);
  }
  
  .card-warning {
    border-color: var(--color-warning);
  }
  
  .card-danger {
    border-color: var(--color-danger);
  }
  
  /* Stat Card específico */
  .stat-card-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  
  .stat-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }
  
  .stat-info {
    flex: 1;
  }
  
  .stat-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-bottom: var(--spacing-1);
  }
  
  .stat-value {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
    line-height: 1;
  }
  
  .stat-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
    border-radius: var(--radius-lg);
    font-size: var(--font-size-2xl);
  }
  
  .stat-trend {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }
  
  .stat-trend.up {
    color: var(--color-success);
  }
  
  .stat-trend.down {
    color: var(--color-danger);
  }
  
  .trend-icon {
    font-size: var(--font-size-base);
  }
`;

if (!document.getElementById('card-styles')) {
    style.id = 'card-styles';
    document.head.appendChild(style);
}
