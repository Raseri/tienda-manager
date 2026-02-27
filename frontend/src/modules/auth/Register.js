// Register.js - Componente de registro
import './login.css';

export function renderRegister(container, onRegisterSuccess) {
    container.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-logo">🏪</div>
          <h1 class="auth-title">Crear Cuenta</h1>
          <p class="auth-subtitle">Únete a Tienda Manager</p>
        </div>

        <form class="auth-form" id="register-form">
          <div id="message" style="display: none;"></div>

          <div class="form-group">
            <label class="form-label" for="nombre">
              Nombre Completo
              <span class="required">*</span>
            </label>
            <input
              type="text"
              id="nombre"
              class="form-input"
              placeholder="Juan Pérez"
              required
              autocomplete="name"
            />
          </div>

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
              placeholder="Mínimo 6 caracteres"
              required
              autocomplete="new-password"
              minlength="6"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="password-confirm">
              Confirmar Contraseña
              <span class="required">*</span>
            </label>
            <input
              type="password"
              id="password-confirm"
              class="form-input"
              placeholder="Repite tu contraseña"
              required
              autocomplete="new-password"
              minlength="6"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="rol">
              Tipo de Usuario
              <span class="required">*</span>
            </label>
            <select id="rol" class="form-select" required>
              <option value="">Selecciona un tipo</option>
              <option value="vendedor">
                Vendedor - Realizar ventas y gestionar clientes
              </option>
              <option value="admin">
                Administrador - Control total del sistema
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-checkbox">
              <input type="checkbox" id="terms" required />
              <span>
                Acepto los <a href="#" class="form-link">términos y condiciones</a>
              </span>
            </label>
          </div>

          <button type="submit" class="btn-auth" id="register-btn">
            Crear Cuenta
          </button>
        </form>

        <div class="auth-footer">
          ¿Ya tienes cuenta?
          <a href="#" id="goto-login">Inicia sesión</a>
        </div>
      </div>
    </div>
  `;

    // Elementos del formulario
    const form = container.querySelector('#register-form');
    const nombreInput = container.querySelector('#nombre');
    const emailInput = container.querySelector('#email');
    const passwordInput = container.querySelector('#password');
    const passwordConfirmInput = container.querySelector('#password-confirm');
    const rolSelect = container.querySelector('#rol');
    const termsCheckbox = container.querySelector('#terms');
    const registerBtn = container.querySelector('#register-btn');
    const message = container.querySelector('#message');
    const gotoLogin = container.querySelector('#goto-login');

    // Función para mostrar mensaje
    function showMessage(text, isError = true) {
        const className = isError ? 'form-error' : 'form-success';
        const icon = isError ? '❌' : '✅';
        message.innerHTML = `
      <div class="${className}">
        <span>${icon}</span>
        <span>${text}</span>
      </div>
    `;
        message.style.display = 'block';
        setTimeout(() => {
            if (!isError) {
                message.style.display = 'none';
            }
        }, 5000);
    }

    // Función para mostrar loading
    function setLoading(isLoading) {
        registerBtn.disabled = isLoading;
        registerBtn.innerHTML = isLoading
            ? '<span class="spinner"></span> Creando cuenta...'
            : 'Crear Cuenta';
    }

    // Validar email
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Handle register submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nombre = nombreInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const passwordConfirm = passwordConfirmInput.value;
        const rol = rolSelect.value;
        const termsAccepted = termsCheckbox.checked;

        // Validaciones
        if (!nombre || !email || !password || !passwordConfirm || !rol) {
            showMessage('Por favor completa todos los campos');
            return;
        }

        if (!validateEmail(email)) {
            showMessage('Por favor ingresa un correo válido');
            return;
        }

        if (password.length < 6) {
            showMessage('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (password !== passwordConfirm) {
            showMessage('Las contraseñas no coinciden');
            return;
        }

        if (!termsAccepted) {
            showMessage('Debes aceptar los términos y condiciones');
            return;
        }

        setLoading(true);

        try {
            // Simular llamada a API (aquí irá la llamada real al backend)
            await simulateRegister({ nombre, email, password, rol });

            // Success
            showMessage('¡Cuenta creada exitosamente! Redirigiendo...', false);
            setTimeout(() => {
                onRegisterSuccess();
            }, 2000);
        } catch (error) {
            showMessage(error.message);
            setLoading(false);
        }
    });

    // Go to login
    gotoLogin.addEventListener('click', (e) => {
        e.preventDefault();
        // Import and render login
        import('./Login.js').then(({ renderLogin }) => {
            renderLogin(container, onRegisterSuccess);
        });
    });

    // Show role info when selected
    rolSelect.addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        if (selectedOption.value) {
            console.log('Rol seleccionado:', selectedOption.value);
        }
    });
}

// Simular registro (temporal hasta tener backend)
async function simulateRegister(userData) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Verificar si el usuario ya existe (simulado)
            const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');

            if (existingUsers.some(u => u.email === userData.email)) {
                reject(new Error('Este correo ya está registrado'));
                return;
            }

            // Crear nuevo usuario
            const newUser = {
                id: Date.now(),
                nombre: userData.nombre,
                email: userData.email,
                rol: userData.rol,
                avatar: userData.nombre.charAt(0).toUpperCase(),
                createdAt: new Date().toISOString(),
                activo: true
            };

            // Guardar usuario (en producción esto se hace en el backend)
            existingUsers.push(newUser);
            localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));

            // Log in automáticamente
            const loginData = {
                id: newUser.id,
                nombre: newUser.nombre,
                email: newUser.email,
                rol: newUser.rol,
                avatar: newUser.avatar,
                loginTime: new Date().toISOString()
            };

            sessionStorage.setItem('user', JSON.stringify(loginData));
            sessionStorage.setItem('authToken', 'demo-token-' + Date.now());

            console.log('✅ Registro exitoso:', newUser);
            resolve(newUser);
        }, 1500); // Simular latencia de red
    });
}

// Cleanup
export function cleanupRegister() {
    // No hay listeners globales que limpiar
}
