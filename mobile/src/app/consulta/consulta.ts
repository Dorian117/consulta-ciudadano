import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { IonButton, IonContent, IonInput } from '@ionic/angular';
import { ApiService } from '../servicios/api.service';

export const ESPERA_MANUAL_MS = 10_000;

/** Devuelve la cedula (6 a 10 digitos) que trae el codigo leido, o null si no es una. */
export function cedulaDeCodigo(valor: string | undefined): string | null {
  const limpio = (valor ?? '').trim();
  return /^[0-9]{6,10}$/.test(limpio) ? limpio : null;
}

@Component({
  selector: 'app-consulta',
  imports: [FormsModule, IonContent, IonInput, IonButton],
  template: `
    <ion-content class="ion-padding">
      <main class="pagina">
        <h1 class="marca">Consulta</h1>
        <p class="suave">{{ api.agente()?.rango }} {{ api.agente()?.apellidos }}</p>

        <ion-button expand="block" size="large" (click)="escanear()" [disabled]="consultando()">Escanear código de barras</ion-button>

        @if (aviso()) {
          <p class="error" role="alert">{{ aviso() }}</p>
        }

        @if (manual()) {
          <form (ngSubmit)="consultarManual()">
            <p class="suave">¿No se puede leer el código? Digite la identificación.</p>
            <ion-input label="Identificación" labelPlacement="stacked" fill="outline" name="cedula" [(ngModel)]="cedula"
              inputmode="numeric" maxlength="10"></ion-input>
            <ion-button expand="block" fill="outline" type="submit" [disabled]="consultando()">Consultar</ion-button>
          </form>
        }

        <ion-button expand="block" fill="clear" color="medium" (click)="salir()">Cerrar sesión</ion-button>
      </main>
    </ion-content>
  `,
})
export class Consulta implements OnInit, OnDestroy {
  protected readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private temporizador?: ReturnType<typeof setTimeout>;

  protected cedula = '';
  protected readonly manual = signal(false);
  protected readonly aviso = signal('');
  protected readonly consultando = signal(false);

  ngOnInit(): void {
    this.temporizador = setTimeout(() => this.manual.set(true), ESPERA_MANUAL_MS);
  }

  ngOnDestroy(): void {
    clearTimeout(this.temporizador);
  }

  protected async escanear(): Promise<void> {
    this.aviso.set('');
    try {
      const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.Code128, BarcodeFormat.Pdf417] });
      if (barcodes.length === 0) return this.manual.set(true);
      const cedula = cedulaDeCodigo(barcodes[0].rawValue);
      if (!cedula) {
        this.aviso.set('El código leído no es una identificación válida. Intente de nuevo o digítela.');
        return this.manual.set(true);
      }
      await this.consultar(cedula);
    } catch {
      this.aviso.set('No se pudo usar la cámara. Digite la identificación.');
      this.manual.set(true);
    }
  }

  protected async consultarManual(): Promise<void> {
    const cedula = cedulaDeCodigo(this.cedula);
    if (!cedula) return this.aviso.set('La identificación debe tener entre 6 y 10 dígitos');
    await this.consultar(cedula);
  }

  private async consultar(cedula: string): Promise<void> {
    this.consultando.set(true);
    this.aviso.set('');
    try {
      await this.api.consultar(cedula);
      this.cedula = '';
      await this.router.navigate(['/resultado']);
    } catch (e) {
      this.aviso.set((e instanceof HttpErrorResponse && e.error?.error?.mensaje) || 'No se pudo conectar con el servidor');
    } finally {
      this.consultando.set(false);
    }
  }

  protected salir(): void {
    this.api.cerrarSesion();
    void this.router.navigate(['/login']);
  }
}

// 1) Lector: ML Kit con los formatos Code 128 (los codigos impresos del proyecto, ver docs/PENDIENTES.md) y PDF417
//    (el de la cedula real; se lee pero su contenido binario no se interpreta: solo se acepta si trae 6 a 10 digitos).
// 2) Respaldo: la digitacion manual aparece a los 10 segundos de abrir la pantalla, o de inmediato si el escaner se
//    cancela, falla o lee algo que no es una cedula. shortcut: el plugin abre su propia pantalla nativa, que esta app
//    no puede cerrar a los 10 s; por eso el plazo se cuenta desde que se abre la pantalla de consulta y no desde que
//    termina el intento de lectura.
// 3) La cedula leida o digitada se valida antes de llamar al servidor (6 a 10 digitos); el servidor la valida de nuevo.
