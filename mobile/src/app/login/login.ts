import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonInput } from '@ionic/angular';
import { ApiService } from '../servicios/api.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, IonContent, IonInput, IonButton],
  template: `
    <ion-content class="ion-padding">
      <main class="pagina">
        <h1 class="marca">Consulta de Ciudadanos</h1>
        <p class="suave">Ingreso para la Fuerza Pública</p>

        <form (ngSubmit)="ingresar()">
          <ion-input label="Identificación" labelPlacement="stacked" fill="outline" name="cedula" [(ngModel)]="cedula"
            inputmode="numeric" maxlength="10" autocomplete="username"></ion-input>
          <ion-input label="Contraseña" labelPlacement="stacked" fill="outline" name="contrasena" type="password"
            [(ngModel)]="contrasena" autocomplete="current-password"></ion-input>

          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }
          <ion-button expand="block" type="submit" [disabled]="enviando()">
            {{ enviando() ? 'Ingresando…' : 'Ingresar' }}
          </ion-button>
        </form>
      </main>
    </ion-content>
  `,
})
export class Login {
  private readonly api = inject(ApiService);
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
      await this.api.iniciarSesion(this.cedula.trim(), this.contrasena);
      await this.router.navigate(['/consulta']);
    } catch (e) {
      this.error.set((e instanceof HttpErrorResponse && e.error?.error?.mensaje) || 'No se pudo conectar con el servidor');
    } finally {
      this.enviando.set(false);
    }
  }
}

// Muestra el mensaje exacto del servidor (clave incorrecta, cuenta bloqueada con minutos restantes). Solo valida en
// pantalla que no haya campos vacios; el formato lo valida el servidor. Si no hay red, avisa que no hay conexion
// (error sin cuerpo JSON) en lugar de dejar la pantalla en silencio.
