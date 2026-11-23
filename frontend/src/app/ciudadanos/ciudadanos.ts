import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SesionService } from '../core/sesion.service';
import { CiudadanoService, ESTADOS, GRUPOS, type Ciudadano } from './ciudadano.service';

const VACIO: Ciudadano = {
  cedula: '',
  nombres: '',
  apellidos: '',
  fechaNacimiento: '',
  lugarNacimiento: '',
  genero: 'M',
  fechaExpedicion: '',
  lugarExpedicion: '',
  grupoSanguineo: 'O+',
  estatura: 1.7,
  estado: 'No requerido',
};

@Component({
  selector: 'app-ciudadanos',
  imports: [FormsModule],
  template: `
    <div class="titulo">
      <h2>Gestión de ciudadanos</h2>
      @if (sesion.puede('ciudadanos', 'crear')) {
        <button class="boton" type="button" (click)="nuevo()">Nuevo ciudadano</button>
      }
    </div>

    @if (mensaje()) {
      <p class="exito" role="status">{{ mensaje() }}</p>
    }

    <form class="filtros" (ngSubmit)="buscar()">
      <div>
        <label for="q">Buscar</label>
        <input id="q" name="q" [(ngModel)]="q" placeholder="Cédula, nombres o apellidos" />
      </div>
      <div>
        <label for="estado">Estado</label>
        <select id="estado" name="estado" [(ngModel)]="estado" (ngModelChange)="buscar()">
          <option value="">Todos</option>
          @for (e of estados; track e) {
            <option [value]="e">{{ e }}</option>
          }
        </select>
      </div>
      <button class="boton secundario" type="submit">Buscar</button>
    </form>

    @if (errorLista()) {
      <p class="error" role="alert">{{ errorLista() }}</p>
    }

    <div class="tabla">
      <table>
        <thead>
          <tr>
            <th>Cédula</th><th>Apellidos</th><th>Nombres</th><th>Nacimiento</th><th>Sangre</th><th>Estado</th><th></th>
          </tr>
        </thead>
        <tbody>
          @for (c of datos(); track c.cedula) {
            <tr>
              <td>{{ c.cedula }}</td>
              <td>{{ c.apellidos }}</td>
              <td>{{ c.nombres }}</td>
              <td>{{ c.fechaNacimiento.slice(0, 10) }}</td>
              <td>{{ c.grupoSanguineo }}</td>
              <td><span class="etiqueta" [class.requerido]="c.estado === 'Requerido'">{{ c.estado }}</span></td>
              <td class="acciones">
                @if (sesion.puede('ciudadanos', 'actualizar')) {
                  <button class="boton secundario" type="button" (click)="editar(c)">Editar</button>
                }
                @if (sesion.puede('ciudadanos', 'eliminar')) {
                  <button class="boton peligro" type="button" (click)="porEliminar.set(c)">Eliminar</button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="vacio">{{ cargando() ? 'Cargando…' : 'No hay ciudadanos para mostrar' }}</td></tr>
          }
        </tbody>
      </table>
    </div>

    <div class="paginacion">
      <button class="boton secundario" type="button" [disabled]="pagina() <= 1" (click)="irA(pagina() - 1)">Anterior</button>
      <span>Página {{ pagina() }} de {{ paginas() }} · {{ total() }} ciudadanos</span>
      <button class="boton secundario" type="button" [disabled]="pagina() >= paginas()" (click)="irA(pagina() + 1)">Siguiente</button>
    </div>

    @if (formulario()) {
      <form class="tarjeta formulario" (ngSubmit)="guardar()" aria-label="Datos del ciudadano">
        <h3>{{ formulario() === 'nuevo' ? 'Nuevo ciudadano' : 'Editar ciudadano' }}</h3>
        <div class="rejilla">
          <div>
            <label for="f-cedula">Cédula</label>
            <input id="f-cedula" name="cedula" [(ngModel)]="f.cedula" [disabled]="formulario() !== 'nuevo'" inputmode="numeric" maxlength="10" />
          </div>
          <div><label for="f-nombres">Nombres</label><input id="f-nombres" name="nombres" [(ngModel)]="f.nombres" maxlength="80" /></div>
          <div><label for="f-apellidos">Apellidos</label><input id="f-apellidos" name="apellidos" [(ngModel)]="f.apellidos" maxlength="80" /></div>
          <div><label for="f-fn">Fecha de nacimiento</label><input id="f-fn" name="fechaNacimiento" type="date" [(ngModel)]="f.fechaNacimiento" /></div>
          <div><label for="f-ln">Lugar de nacimiento</label><input id="f-ln" name="lugarNacimiento" [(ngModel)]="f.lugarNacimiento" maxlength="80" /></div>
          <div>
            <label for="f-genero">Género</label>
            <select id="f-genero" name="genero" [(ngModel)]="f.genero"><option value="M">M</option><option value="F">F</option></select>
          </div>
          <div><label for="f-fe">Fecha de expedición</label><input id="f-fe" name="fechaExpedicion" type="date" [(ngModel)]="f.fechaExpedicion" /></div>
          <div><label for="f-le">Lugar de expedición</label><input id="f-le" name="lugarExpedicion" [(ngModel)]="f.lugarExpedicion" maxlength="80" /></div>
          <div>
            <label for="f-gs">Grupo sanguíneo</label>
            <select id="f-gs" name="grupoSanguineo" [(ngModel)]="f.grupoSanguineo">
              @for (g of grupos; track g) { <option [value]="g">{{ g }}</option> }
            </select>
          </div>
          <div><label for="f-est">Estatura (m)</label><input id="f-est" name="estatura" type="number" step="0.01" min="0.5" max="2.5" [(ngModel)]="f.estatura" /></div>
          <div>
            <label for="f-estado">Estado</label>
            <select id="f-estado" name="estado" [(ngModel)]="f.estado">
              @for (e of estados; track e) { <option [value]="e">{{ e }}</option> }
            </select>
          </div>
        </div>
        @if (errorForm()) {
          <p class="error" role="alert">{{ errorForm() }}</p>
        }
        <div class="botones">
          <button class="boton" type="submit" [disabled]="guardando()">{{ guardando() ? 'Guardando…' : 'Guardar' }}</button>
          <button class="boton secundario" type="button" (click)="formulario.set(null)">Cancelar</button>
        </div>
      </form>
    }

    @if (porEliminar(); as c) {
      <div class="tarjeta confirmar" role="alertdialog" aria-label="Confirmar eliminación">
        <p>¿Eliminar a <strong>{{ c.nombres }} {{ c.apellidos }}</strong> (cédula {{ c.cedula }})? Esta acción no se puede deshacer.</p>
        @if (errorEliminar()) {
          <p class="error" role="alert">{{ errorEliminar() }}</p>
        }
        <div class="botones">
          <button class="boton peligro" type="button" (click)="eliminar(c)">Sí, eliminar</button>
          <button class="boton secundario" type="button" (click)="porEliminar.set(null)">Cancelar</button>
        </div>
      </div>
    }
  `,
})
export class Ciudadanos implements OnInit {
  protected readonly sesion = inject(SesionService);
  private readonly api = inject(CiudadanoService);

  protected readonly estados = ESTADOS;
  protected readonly grupos = GRUPOS;

  protected q = '';
  protected estado = '';
  protected readonly limite = 10;

  protected readonly datos = signal<Ciudadano[]>([]);
  protected readonly total = signal(0);
  protected readonly pagina = signal(1);
  protected readonly paginas = computed(() => Math.max(1, Math.ceil(this.total() / this.limite)));
  protected readonly cargando = signal(false);
  protected readonly errorLista = signal('');
  protected readonly mensaje = signal('');

  protected readonly formulario = signal<'nuevo' | string | null>(null);
  protected f: Ciudadano = { ...VACIO };
  protected readonly errorForm = signal('');
  protected readonly guardando = signal(false);

  protected readonly porEliminar = signal<Ciudadano | null>(null);
  protected readonly errorEliminar = signal('');

  ngOnInit(): void {
    void this.cargar();
  }

  protected buscar(): void {
    this.pagina.set(1);
    void this.cargar();
  }

  protected irA(pagina: number): void {
    this.pagina.set(pagina);
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.errorLista.set('');
    try {
      const r = await this.api.listar({ estado: this.estado, q: this.q, pagina: this.pagina(), limite: this.limite });
      this.datos.set(r.datos);
      this.total.set(r.total);
    } catch (e) {
      this.errorLista.set(mensajeDe(e));
    } finally {
      this.cargando.set(false);
    }
  }

  protected nuevo(): void {
    this.f = { ...VACIO };
    this.errorForm.set('');
    this.formulario.set('nuevo');
  }

  protected editar(c: Ciudadano): void {
    this.f = { ...c, fechaNacimiento: c.fechaNacimiento.slice(0, 10), fechaExpedicion: c.fechaExpedicion.slice(0, 10) };
    this.errorForm.set('');
    this.formulario.set(c.cedula);
  }

  protected async guardar(): Promise<void> {
    this.guardando.set(true);
    this.errorForm.set('');
    try {
      const datos = { ...this.f, estatura: Number(this.f.estatura) };
      if (this.formulario() === 'nuevo') {
        await this.api.crear(datos);
        this.mensaje.set('Ciudadano creado');
      } else {
        const { cedula, ...cambios } = datos;
        await this.api.actualizar(cedula, cambios);
        this.mensaje.set('Ciudadano actualizado');
      }
      this.formulario.set(null);
      await this.cargar();
    } catch (e) {
      this.errorForm.set(mensajeDe(e));
    } finally {
      this.guardando.set(false);
    }
  }

  protected async eliminar(c: Ciudadano): Promise<void> {
    this.errorEliminar.set('');
    try {
      await this.api.eliminar(c.cedula);
      this.porEliminar.set(null);
      this.mensaje.set('Ciudadano eliminado');
      if (this.datos().length === 1 && this.pagina() > 1) this.pagina.update((p) => p - 1);
      await this.cargar();
    } catch (e) {
      this.errorEliminar.set(mensajeDe(e));
    }
  }
}

function mensajeDe(e: unknown): string {
  return (e instanceof HttpErrorResponse && e.error?.error?.mensaje) || 'No se pudo completar la operación';
}

// 1) Una sola pantalla: tabla con filtros arriba, formulario de crear o editar y confirmacion de eliminar que
//    aparecen debajo cuando hacen falta.
// 2) Los botones Nuevo, Editar y Eliminar se muestran segun sesion.puede(...), que sale del menu del servidor.
//    Es solo comodidad: si alguien los activara a la fuerza, el servidor responde 403.
// 3) Los errores del servidor (cedula duplicada, datos invalidos) se muestran tal cual dentro del formulario;
//    el frontend no repite las reglas de validacion, porque la que cuenta es la del servidor.
// 4) La cedula no se puede editar: es la llave del registro y el servidor tampoco la acepta en PUT.
// 5) Eliminar siempre pide confirmacion con el nombre y la cedula, para no borrar a la persona equivocada.
// 6) Si se elimina el ultimo registro de una pagina que no es la primera, se retrocede una pagina.
