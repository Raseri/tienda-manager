// Login.js - Componente de inicio de sesión
import './login.css';
import { login } from '../../services/authService.js';

export function renderLogin(container, onLoginSuccess) {
  container.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-logo">🏪</div>
          <h1 class="auth-title">Tienda Manager</h1>
          <p class="auth-subtitle">Inicia sesión para continuar</p>
        </div>

        <form class="auth-form" id="login-form">
          <div id="error-message" style="display: none;"></div>

          <div class="form-group">
            <label class="form-label" for="email">
              Correo Electrónico
              <span class="required">*</span>
            </label>
            <input
              type="email"
              id="email"
              class="form-input"
              placeholder="tu@email.com"
              required
              autocomplete="email"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="password">
              Contraseña
              <span class="required">*</span>
            </label>
            <input
              type="password"
              id="password"
              class="form-input"
              placeholder="••••••••"
              required
              autocomplete="current-password"
            />
          </div>

          <div class="form-options">
            <label class="form-checkbox">
              <input type="checkbox" id="remember" />
              <span>Recordarme</span>
            </label>
            <a href="#" class="form-link" id="forgot-password">¿Olvidaste tu contraseña?</a>
          </div>

          <button type="submit" class="btn-auth" id="login-btn">
            Iniciar Sesión
          </button>

          <div class="auth-divider">O usa acceso rápido</div>

          <div class="quick-access-grid">
            <button type="button" class="btn-auth btn-quick-admin" id="demo-admin-btn">
              👑 Admin
            </button>

            <button type="button" class="btn-auth btn-quick-vendedor" id="demo-vendedor-btn">
              🛍️ Vendedor
            </button>

            <button type="button" class="btn-auth btn-quick-pedidos" id="demo-pedidos-btn">
              🛵 Pedidos
            </button>
          </div>
        </form>

        <div class="auth-footer">
          ¿No tienes cuenta?
          <a href="#" id="goto-register">Regístrate aquí</a>
        </div>

        <div class="credentials-panel">
          <div class="credentials-title">
            🔐 FORMA DE ACCEDER
          </div>
          <div class="credentials-grid">
            <div class="credential-card credential-admin">
              <div class="credential-role">👑 ADMINISTRADOR</div>
              <div class="credential-email">📧 admin@tienda.com</div>
              <div class="credential-pass">🔑 admin123</div>
            </div>
            <div class="credential-card credential-vendedor">
              <div class="credential-role">🛍️ VENDEDOR</div>
              <div class="credential-email">📧 vendedor@tienda.com</div>
              <div class="credential-pass">🔑 vendedor123</div>
            </div>
            <div class="credential-card credential-pedidos">
              <div class="credential-role">🛵 PEDIDOS</div>
              <div class="credential-email">📧 repartidor@tienda.com</div>
              <div class="credential-pass">🔑 repartidor123</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Elementos del formulario
  const form = container.querySelector('#login-form');
  const emailInput = container.querySelector('#email');
  const passwordInput = container.querySelector('#password');
  const rememberCheckbox = container.querySelector('#remember');
  const loginBtn = container.querySelector('#login-btn');
  const errorMessage = container.querySelector('#error-message');
  const gotoRegister = container.querySelector('#goto-register');
  const demoAdminBtn = container.querySelector('#demo-admin-btn');
  const demoVendedorBtn = container.querySelector('#demo-vendedor-btn');
  const demoPedidosBtn = container.querySelector('#demo-pedidos-btn');
  const forgotPassword = container.querySelector('#forgot-password');

  // Función para mostrar error
  function showError(message) {
    errorMessage.innerHTML = `
      <div class="form-error">
        <span>❌</span>
        <span>${message}</span>
      </div>
    `;
    errorMessage.style.display = 'block';
    setTimeout(() => {
      errorMessage.style.display = 'none';
    }, 5000);
  }

  // Función para mostrar loading
  function setLoading(isLoading) {
    loginBtn.disabled = isLoading;
    loginBtn.innerHTML = isLoading
      ? '<span class="spinner"></span> Iniciando sesión...'
      : 'Iniciar Sesión';
  }

  // Handle login submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const remember = rememberCheckbox.checked;

    if (!email || !password) {
      showError('Por favor completa todos los campos');
      return;
    }

    setLoading(true);

    try {
      // Llamada real a la API usando authService
      const result = await login(email, password, remember);

      if (result.success) {
        // Success
        onLoginSuccess();
      } else {
        showError(result.error || 'Error al iniciar sesión');
        setLoading(false);
      }
    } catch (error) {
      showError(error.message || 'Error al iniciar sesión');
      setLoading(false);
    }
  });

  // Demo buttons
  demoAdminBtn.addEventListener('click', async () => {
    emailInput.value = 'admin@tienda.com';
    passwordInput.value = 'admin123';
    form.dispatchEvent(new Event('submit'));
  });

  demoVendedorBtn.addEventListener('click', async () => {
    emailInput.value = 'vendedor@tienda.com';
    passwordInput.value = 'vendedor123';
    form.dispatchEvent(new Event('submit'));
  });

  demoPedidosBtn.addEventListener('click', async () => {
    emailInput.value = 'repartidor@tienda.com';
    passwordInput.value = 'repartidor123';
    form.dispatchEvent(new Event('submit'));
  });

  // Forgot password
  forgotPassword.addEventListener('click', (e) => {
    e.preventDefault();
    showError('Funcionalidad en desarrollo. Contacta al administrador.');
  });

  // Go to register
  gotoRegister.addEventListener('click', (e) => {
    e.preventDefault();
    // Import and render register
    import('./Register.js').then(({ renderRegister }) => {
      renderRegister(container, onLoginSuccess);
    });
  });
}

// Cleanup
export function cleanupLogin() {
  // No hay listeners globales que limpiar
}
