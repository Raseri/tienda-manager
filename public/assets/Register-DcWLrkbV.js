const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-C6ZsV0Rw.js","assets/index-CPF0DPG7.css"])))=>i.map(i=>d[i]);
import{_ as C}from"./index-C6ZsV0Rw.js";function T(e,l){e.innerHTML=`
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
  `;const c=e.querySelector("#register-form"),i=e.querySelector("#nombre"),r=e.querySelector("#email"),d=e.querySelector("#password"),m=e.querySelector("#password-confirm"),p=e.querySelector("#rol"),h=e.querySelector("#terms"),f=e.querySelector("#register-btn"),u=e.querySelector("#message"),y=e.querySelector("#goto-login");function t(o,s=!0){const a=s?"form-error":"form-success",n=s?"❌":"✅";u.innerHTML=`
      <div class="${a}">
        <span>${n}</span>
        <span>${o}</span>
      </div>
    `,u.style.display="block",setTimeout(()=>{s||(u.style.display="none")},5e3)}function g(o){f.disabled=o,f.innerHTML=o?'<span class="spinner"></span> Creando cuenta...':"Crear Cuenta"}function w(o){return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o)}c.addEventListener("submit",async o=>{o.preventDefault();const s=i.value.trim(),a=r.value.trim(),n=d.value,v=m.value,b=p.value,S=h.checked;if(!s||!a||!n||!v||!b){t("Por favor completa todos los campos");return}if(!w(a)){t("Por favor ingresa un correo válido");return}if(n.length<6){t("La contraseña debe tener al menos 6 caracteres");return}if(n!==v){t("Las contraseñas no coinciden");return}if(!S){t("Debes aceptar los términos y condiciones");return}g(!0);try{await I({nombre:s,email:a,password:n,rol:b}),t("¡Cuenta creada exitosamente! Redirigiendo...",!1),setTimeout(()=>{l()},2e3)}catch(q){t(q.message),g(!1)}}),y.addEventListener("click",o=>{o.preventDefault(),C(async()=>{const{renderLogin:s}=await import("./index-C6ZsV0Rw.js").then(a=>a.L);return{renderLogin:s}},__vite__mapDeps([0,1])).then(({renderLogin:s})=>{s(e,l)})}),p.addEventListener("change",o=>{const s=o.target.options[o.target.selectedIndex];s.value&&console.log("Rol seleccionado:",s.value)})}async function I(e){return new Promise((l,c)=>{setTimeout(()=>{const i=JSON.parse(localStorage.getItem("registeredUsers")||"[]");if(i.some(m=>m.email===e.email)){c(new Error("Este correo ya está registrado"));return}const r={id:Date.now(),nombre:e.nombre,email:e.email,rol:e.rol,avatar:e.nombre.charAt(0).toUpperCase(),createdAt:new Date().toISOString(),activo:!0};i.push(r),localStorage.setItem("registeredUsers",JSON.stringify(i));const d={id:r.id,nombre:r.nombre,email:r.email,rol:r.rol,avatar:r.avatar,loginTime:new Date().toISOString()};sessionStorage.setItem("user",JSON.stringify(d)),sessionStorage.setItem("authToken","demo-token-"+Date.now()),console.log("✅ Registro exitoso:",r),l(r)},1500)})}export{T as renderRegister};
//# sourceMappingURL=Register-DcWLrkbV.js.map
