// Button.js - Componente de botón reutilizable

export function createButton({
    text,
    variant = 'primary',
    icon = null,
    onClick = () => { },
    type = 'button',
    disabled = false,
    fullWidth = false
}) {
    const button = document.createElement('button');
    button.type = type;
    button.className = `btn btn-${variant}`;

    if (fullWidth) {
        button.classList.add('btn-full');
    }

    if (disabled) {
        button.disabled = true;
    }

    if (icon) {
        button.innerHTML = `
      <span class="btn-icon">${icon}</span>
      <span>${text}</span>
    `;
    } else {
        button.textContent = text;
    }

    button.addEventListener('click', onClick);

    return button;
}

// Agregar estilos de botón dinámicamente
const style = document.createElement('style');
style.textContent = `
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    padding: var(--spacing-3) var(--spacing-5);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    border-radius: var(--radius-lg);
    border: none;
    cursor: pointer;
    transition: all var(--transition-base);
    white-space: nowrap;
    user-select: none;
  }
  
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .btn-full {
    width: 100%;
  }
  
  .btn-icon {
    display: flex;
    align-items: center;
    font-size: var(--font-size-lg);
  }
  
  /* Variantes de botón */
  .btn-primary {
    background: var(--color-primary);
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
    box-shadow: var(--shadow-glow);
    transform: translateY(-1px);
  }
  
  .btn-secondary {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }
  
  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-hover);
    border-color: var(--border-color-light);
  }
  
  .btn-success {
    background: var(--color-success);
    color: white;
  }
  
  .btn-success:hover:not(:disabled) {
    background: hsl(142, 71%, 38%);
    box-shadow: 0 0 20px hsla(142, 71%, 45%, 0.4);
  }
  
  .btn-danger {
    background: var(--color-danger);
    color: white;
  }
  
  .btn-danger:hover:not(:disabled) {
    background: hsl(4, 90%, 50%);
    box-shadow: 0 0 20px hsla(4, 90%, 58%, 0.4);
  }
  
  .btn-ghost {
    background: transparent;
    color: var(--text-primary);
  }
  
  .btn-ghost:hover:not(:disabled) {
    background: var(--bg-hover);
  }
`;

if (!document.getElementById('button-styles')) {
    style.id = 'button-styles';
    document.head.appendChild(style);
}
