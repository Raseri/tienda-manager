// Input.js - Componente de input reutilizable

export function createInput({
    label,
    name,
    type = 'text',
    value = '',
    placeholder = '',
    required = false,
    error = null,
    onChange = () => { }
}) {
    const container = document.createElement('div');
    container.className = 'input-group';

    const inputId = `input-${name}-${Date.now()}`;

    container.innerHTML = `
    <label for="${inputId}" class="input-label">
      ${label}
      ${required ? '<span class="required-mark">*</span>' : ''}
    </label>
    <input
      type="${type}"
      id="${inputId}"
      name="${name}"
      class="input-field ${error ? 'input-error' : ''}"
      placeholder="${placeholder}"
      value="${value}"
      ${required ? 'required' : ''}
    />
    ${error ? `<span class="input-error-message">${error}</span>` : ''}
  `;

    const input = container.querySelector('input');
    input.addEventListener('input', (e) => onChange(e.target.value));

    return container;
}

export function createTextarea({
    label,
    name,
    value = '',
    placeholder = '',
    required = false,
    rows = 4,
    error = null,
    onChange = () => { }
}) {
    const container = document.createElement('div');
    container.className = 'input-group';

    const textareaId = `textarea-${name}-${Date.now()}`;

    container.innerHTML = `
    <label for="${textareaId}" class="input-label">
      ${label}
      ${required ? '<span class="required-mark">*</span>' : ''}
    </label>
    <textarea
      id="${textareaId}"
      name="${name}"
      class="input-field ${error ? 'input-error' : ''}"
      placeholder="${placeholder}"
      rows="${rows}"
      ${required ? 'required' : ''}
    >${value}</textarea>
    ${error ? `<span class="input-error-message">${error}</span>` : ''}
  `;

    const textarea = container.querySelector('textarea');
    textarea.addEventListener('input', (e) => onChange(e.target.value));

    return container;
}

// Estilos de input
const style = document.createElement('style');
style.textContent = `
  .input-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-4);
  }
  
  .input-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--text-primary);
  }
  
  .required-mark {
    color: var(--color-danger);
    margin-left: var(--spacing-1);
  }
  
  .input-field {
    width: 100%;
    padding: var(--spacing-3);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--font-size-base);
    transition: all var(--transition-base);
  }
  
  .input-field:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .input-field::placeholder {
    color: var(--text-tertiary);
  }
  
  .input-field:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .input-field.input-error {
    border-color: var(--color-danger);
  }
  
  .input-error-message {
    font-size: var(--font-size-sm);
    color: var(--color-danger);
  }
  
  textarea.input-field {
    resize: vertical;
    min-height: 80px;
  }
`;

if (!document.getElementById('input-styles')) {
    style.id = 'input-styles';
    document.head.appendChild(style);
}
