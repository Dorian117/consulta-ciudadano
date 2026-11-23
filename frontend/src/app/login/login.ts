import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SesionService } from '../core/sesion.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <main class="centro">
      <form class="tarjeta" (ngSubmit)="ingresar()" novalidate>
        <h1 class="marca">Consulta de Ciudadanos</h1>
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
  `,
  styles: `
    .centro { min-height: 100vh; display: grid; place-items: center; padding: 1rem; }
    form { width: 100%; max-width: 380px; display: grid; gap: 0.6rem; }
    h1 { font-size: 1.9rem; color: var(--primario-oscuro); }
    .suave { margin: 0 0 0.5rem; color: var(--suave); }
    button { margin-top: 0.4rem; }
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
