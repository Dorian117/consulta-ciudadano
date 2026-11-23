import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SesionService } from '../core/sesion.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="pantalla">
      <aside class="portada" aria-hidden="true">
        <span class="marca">Consulta de Ciudadanos</span>
        <p>Registro de ciudadanos y consulta de su estado para la Fuerza Pública.</p>
      </aside>
      <main class="centro">
        <form (ngSubmit)="ingresar()" novalidate>
          <h1>Iniciar sesión</h1>
          <p class="suave">Ingrese con su identificación y contraseña.</p>

          @if (sesion.aviso()) {
            <p class="aviso" role="status">{{ sesion.aviso() }}</p>
          }

          <label for="cedula">Identificación</label>
          <input id="cedula" name="cedula" [(ngModel)]="cedula" inputmode="numeric" autocomplete="username" maxlength="10" />

          <label for="contrasena">Contraseña</label>
          <input id="contrasena" name="contrasena" type="password" [(ngModel)]="contrasena" autocomplete="current-password" />

          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }

          <button class="boton" type="submit" [disabled]="enviando()">
            {{ enviando() ? 'Ingresando…' : 'Ingresar' }}
          </button>
        </form>
      </main>
    </div>
  `,
  styles: `
    .pantalla { min-height: 100vh; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
    .portada { background: var(--granate); color: #e8d9d3; padding: clamp(2rem, 6vw, 5rem); display: flex; flex-direction: column; justify-content: flex-end; gap: 1rem; }
    .portada .marca { color: #fff; font-size: clamp(2.6rem, 5.5vw, 4.5rem); line-height: 1; margin: 0; }
    .portada p { margin: 0; max-width: 32ch; }
    .centro { display: grid; place-items: center; padding: 2rem; }
    form { width: 100%; max-width: 360px; display: grid; gap: 0.3rem; }
    label { margin-top: 0.7rem; }
    h1 { color: var(--granate); font-size: 2.1rem; }
    .suave { margin: 0 0 0.75rem; }
    button { margin-top: 1.2rem; }
    @media (max-width: 800px) {
      .pantalla { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
      .portada { padding: 1.5rem; justify-content: flex-start; }
      .portada .marca { font-size: 2rem; }
      .portada p { display: none; }
      .centro { place-items: start center; padding: 1.5rem 1rem; }
    }
  `,
})
export class Login {
  protected readonly sesion = inject(SesionService);
  private readonly router = inject(Router);

  protected cedula = '';
  protected contrasena = '';
  protected readonly error = signal('');
  protected readonly enviando = signal(false);

  async ingresar(): Promise<void> {
    this.error.set('');
    if (!this.cedula.trim() || !this.contrasena) {
      this.error.set('Ingrese la identificación y la contraseña');
      return;
    }
    this.enviando.set(true);
    try {
      await this.sesion.iniciar(this.cedula.trim(), this.contrasena);
      await this.router.navigate(['/']);
    } catch (e) {
      const mensaje = e instanceof HttpErrorResponse ? e.error?.error?.mensaje : undefined;
      this.error.set(mensaje ?? 'No se pudo conectar con el servidor');
    } finally {
      this.enviando.set(false);
    }
  }
}

// 1) El login muestra tal cual el mensaje que manda el servidor (clave incorrecta, cuenta bloqueada con minutos
//    restantes, datos invalidos): asi el texto vive en un solo lugar, el backend.
// 2) Solo se valida en pantalla que no haya campos vacios; el formato de la cedula lo valida el servidor,
//    que es la validacion que cuenta.
// 3) El campo de contrasena es type=password y autocomplete=current-password para que el navegador pueda ayudar.
// 4) role=alert hace que un lector de pantalla anuncie el error cuando aparece.
