import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent } from '@ionic/angular';
import { ApiService } from '../servicios/api.service';

@Component({
  selector: 'app-resultado',
  imports: [IonContent, IonButton],
  template: `
    <ion-content>
      @if (api.resultado(); as r) {
        <main class="resultado" [class.requerido]="r.estado === 'Requerido'" [class.noenc]="r.estado === 'No encontrado'">
          <p class="cedula">Identificación {{ r.cedula }}</p>
          <h1 class="estado">{{ r.estado }}</h1>
          @if (r.nombres) {
            <p class="nombre">{{ r.nombres }} {{ r.apellidos }}</p>
          } @else {
            <p class="nombre">No hay ningún ciudadano registrado con esa identificación.</p>
          }
          <ion-button expand="block" size="large" color="light" (click)="nueva()">Nueva consulta</ion-button>
        </main>
      }
    </ion-content>
  `,
})
export class Resultado {
  protected readonly api = inject(ApiService);
  private readonly router = inject(Router);

  protected nueva(): void {
    this.api.resultado.set(null);
    void this.router.navigate(['/consulta']);
  }
}

// El resultado ocupa toda la pantalla y se lee de lejos (puesto de control): fondo granate y "REQUERIDO" en grande
// cuando la persona es requerida; fondo claro cuando no lo es; gris para "No encontrado". El color nunca es la unica
// pista: el estado siempre esta escrito en letras grandes.
