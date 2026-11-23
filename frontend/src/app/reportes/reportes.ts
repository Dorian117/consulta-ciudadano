import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { SesionService } from '../core/sesion.service';

@Component({
  selector: 'app-reportes',
  imports: [FormsModule],
  template: `
    <div class="titulo"><h2>Reportes</h2></div>
    <p class="suave">Genere un PDF con los ciudadanos registrados, según su estado.</p>

    <form class="filtros" (ngSubmit)="generar()">
      <div>
        <label for="filtro">Ciudadanos</label>
        <select id="filtro" name="filtro" [(ngModel)]="filtro">
          <option value="Todos">Todos</option>
          <option value="Requerido">Requeridos</option>
          <option value="No requerido">No requeridos</option>
        </select>
      </div>
      @if (sesion.puede('reportes', 'leer')) {
        <button class="boton" type="submit" [disabled]="generando()">{{ generando() ? 'Generando…' : 'Generar PDF' }}</button>
      }
    </form>

    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (exito()) {
      <p class="exito" role="status">{{ exito() }}</p>
    }
  `,
})
export class Reportes {
  protected readonly sesion = inject(SesionService);
  private readonly http = inject(HttpClient);

  protected filtro = 'Todos';
  protected readonly generando = signal(false);
  protected readonly error = signal('');
  protected readonly exito = signal('');

  async generar(): Promise<void> {
    this.error.set('');
    this.exito.set('');
    this.generando.set(true);
    try {
      const pdf = await firstValueFrom(
        this.http.get('/api/reportes/ciudadanos', { params: { estado: this.filtro }, responseType: 'blob' }),
      );
      const enlace = document.createElement('a');
      enlace.href = URL.createObjectURL(pdf);
      enlace.download = `reporte_ciudadanos_${new Date().toISOString().slice(0, 10)}.pdf`;
      enlace.click();
      URL.revokeObjectURL(enlace.href);
      this.exito.set('El PDF se generó y se descargó');
    } catch (e) {
      this.error.set(await mensajeDe(e));
    } finally {
      this.generando.set(false);
    }
  }
}

// Con responseType blob el cuerpo de un error tambien llega como Blob: hay que leerlo como texto y convertirlo a JSON
// para mostrar el mensaje que mando el servidor (por ejemplo "No existen ciudadanos registrados...").
async function mensajeDe(e: unknown): Promise<string> {
  if (e instanceof HttpErrorResponse && e.error instanceof Blob) {
    try {
      return JSON.parse(await e.error.text())?.error?.mensaje ?? 'No se pudo generar el reporte';
    } catch {
      /* cuerpo que no es JSON */
    }
  }
  return 'No se pudo generar el reporte';
}

// 1) La pantalla reutiliza las clases globales de styles.css (titulo, filtros, boton, error, exito): no tiene CSS propio.
// 2) El PDF se pide con HttpClient (no con un enlace directo) para que el interceptor agregue el token de sesion.
// 3) Se descarga con un enlace temporal con atributo download: abrirlo en una pestana nueva lo bloquean los navegadores
//    cuando la apertura ocurre despues de esperar la respuesta del servidor.
// 4) El boton se ve solo si el perfil tiene permiso de lectura sobre reportes; la seguridad real es el 403 del servidor.
