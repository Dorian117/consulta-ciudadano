import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { SesionService } from '../core/sesion.service';

const ACCIONES = ['crear', 'leer', 'actualizar', 'eliminar'] as const;
const FUERZAS = ['Policia', 'Ejercito', 'Armada', 'Fuerza Aerea'];

interface PermisoOpcion { codigo: string; nombre: string; crear: boolean; leer: boolean; actualizar: boolean; eliminar: boolean }
interface Perfil { id: string; nombre: string; descripcion: string; protegido: boolean; permisos: PermisoOpcion[] }
interface UsuarioFila { id: string; tipo: 'web' | 'fp'; cedula: string; nombres: string; correo: string; rol: string; activo: boolean; bloqueado: boolean }
interface Rango { fuerza: string; nombre: string }

const formularioVacio = () => ({ tipo: 'web', cedula: '', nombres: '', apellidos: '', correo: '', contrasena: '', perfilId: '', fuerza: FUERZAS[0], rango: '', idFuerza: '' });

@Component({
  selector: 'app-seguridad',
  imports: [FormsModule],
  template: `
    <div class="titulo"><h2>Seguridad</h2></div>
    <p class="suave">Administre los roles y sus permisos, y cree usuarios de la Registraduría y de Fuerza Pública.</p>

    @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
    @if (exito()) { <p class="exito" role="status">{{ exito() }}</p> }

    <h3>Roles y permisos</h3>
    <div class="filtros">
      <div>
        <label for="perfil">Rol</label>
        <select id="perfil" name="perfil" [ngModel]="perfilId()" (ngModelChange)="perfilId.set($event)">
          @for (p of perfiles(); track p.id) { <option [value]="p.id">{{ p.nombre }}</option> }
        </select>
      </div>
    </div>

    @if (perfil(); as p) {
      <div class="tabla">
        <table>
          <thead><tr><th>Opción</th>@for (a of acciones; track a) { <th>{{ a }}</th> }</tr></thead>
          <tbody>
            @for (o of p.permisos; track o.codigo) {
              <tr>
                <td>{{ o.nombre }}</td>
                @for (a of acciones; track a) {
                  <td><input type="checkbox" [attr.aria-label]="a + ' ' + o.nombre" [checked]="o[a]" [disabled]="p.protegido || !puedeEditar()" (change)="marcar(o, a, $event)" /></td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (p.protegido) {
        <p class="aviso">El rol Administrador no se puede modificar.</p>
      } @else if (puedeEditar()) {
        <div class="botones"><button class="boton" type="button" (click)="guardarPermisos(p)">Guardar permisos</button></div>
      }
    }

    @if (sesion.puede('seguridad', 'crear')) {
      <form class="tarjeta formulario" (ngSubmit)="crearRol()">
        <h3>Nuevo rol</h3>
        <div class="rejilla">
          <div><label for="nombreRol">Nombre</label><input id="nombreRol" name="nombreRol" [(ngModel)]="nombreRol" required minlength="3" /></div>
        </div>
        <div class="botones"><button class="boton" type="submit">Crear rol</button></div>
      </form>
    }

    <h3>Usuarios</h3>
    <div class="tabla">
      <table>
        <thead><tr><th>Cédula</th><th>Nombre</th><th>Tipo</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          @for (u of usuarios(); track u.tipo + u.id) {
            <tr>
              <td>{{ u.cedula }}</td><td>{{ u.nombres }}</td><td>{{ u.tipo === 'web' ? 'Web' : 'Fuerza Pública' }}</td><td>{{ u.rol }}</td>
              <td>{{ u.bloqueado ? 'Bloqueado' : u.activo ? 'Activo' : 'Inactivo' }}</td>
              <td class="acciones">
                @if (u.bloqueado && sesion.puede('seguridad', 'actualizar')) {
                  <button class="boton secundario" type="button" (click)="desbloquear(u)">Desbloquear</button>
                }
              </td>
            </tr>
          } @empty { <tr><td colspan="6" class="vacio">No hay usuarios</td></tr> }
        </tbody>
      </table>
    </div>

    @if (sesion.puede('seguridad', 'crear')) {
      <form class="tarjeta formulario" (ngSubmit)="crearUsuario()">
        <h3>Nuevo usuario</h3>
        <div class="rejilla">
          <div>
            <label for="tipo">Tipo de usuario</label>
            <select id="tipo" name="tipo" [(ngModel)]="f.tipo">
              <option value="web">Web (Registraduría)</option>
              <option value="fp">Fuerza Pública (app móvil)</option>
            </select>
          </div>
          <div><label for="cedula">Cédula</label><input id="cedula" name="cedula" [(ngModel)]="f.cedula" required inputmode="numeric" /></div>
          <div><label for="nombres">Nombres</label><input id="nombres" name="nombres" [(ngModel)]="f.nombres" required /></div>
          @if (f.tipo === 'fp') {
            <div><label for="apellidos">Apellidos</label><input id="apellidos" name="apellidos" [(ngModel)]="f.apellidos" required /></div>
          }
          <div><label for="correo">Correo</label><input id="correo" name="correo" type="email" [(ngModel)]="f.correo" required /></div>
          <div><label for="contrasena">Contraseña</label><input id="contrasena" name="contrasena" type="password" autocomplete="new-password" [(ngModel)]="f.contrasena" required /></div>
          @if (f.tipo === 'web') {
            <div>
              <label for="rol">Rol</label>
              <select id="rol" name="rol" [(ngModel)]="f.perfilId" required>
                <option value="" disabled>Seleccione…</option>
                @for (p of perfilesWeb(); track p.id) { <option [value]="p.id">{{ p.nombre }}</option> }
              </select>
            </div>
          } @else {
            <div>
              <label for="fuerza">Fuerza</label>
              <select id="fuerza" name="fuerza" [(ngModel)]="f.fuerza" (ngModelChange)="f.rango = ''">
                @for (x of fuerzas; track x) { <option [value]="x">{{ x }}</option> }
              </select>
            </div>
            <div>
              <label for="rango">Rango</label>
              <select id="rango" name="rango" [(ngModel)]="f.rango" required>
                <option value="" disabled>Seleccione…</option>
                @for (r of rangosDe(f.fuerza); track r.nombre) { <option [value]="r.nombre">{{ r.nombre }}</option> }
              </select>
            </div>
            <div><label for="idFuerza">Identificador de fuerza</label><input id="idFuerza" name="idFuerza" [(ngModel)]="f.idFuerza" required /></div>
          }
        </div>
        <p class="suave">La contraseña debe tener al menos 6 caracteres, con una mayúscula, una minúscula y un dígito.</p>
        <div class="botones"><button class="boton" type="submit">Crear usuario</button></div>
      </form>
    }
  `,
})
export class Seguridad implements OnInit {
  protected readonly sesion = inject(SesionService);
  private readonly http = inject(HttpClient);

  protected readonly acciones = ACCIONES;
  protected readonly fuerzas = FUERZAS;
  protected readonly perfiles = signal<Perfil[]>([]);
  protected readonly perfilId = signal('');
  protected readonly usuarios = signal<UsuarioFila[]>([]);
  protected readonly rangos = signal<Rango[]>([]);
  protected readonly error = signal('');
  protected readonly exito = signal('');
  protected nombreRol = '';
  protected f = formularioVacio();

  protected perfil = () => this.perfiles().find((p) => p.id === this.perfilId());
  protected perfilesWeb = () => this.perfiles().filter((p) => p.nombre !== 'Fuerza Publica');
  protected rangosDe = (fuerza: string) => this.rangos().filter((r) => r.fuerza === fuerza);
  protected puedeEditar = () => this.sesion.puede('seguridad', 'actualizar');

  async ngOnInit(): Promise<void> {
    await this.cargar(true);
  }

  private async cargar(primera = false): Promise<void> {
    try {
      const [perfiles, usuarios, rangos] = await Promise.all([
        firstValueFrom(this.http.get<Perfil[]>('/api/seguridad/perfiles')),
        firstValueFrom(this.http.get<UsuarioFila[]>('/api/seguridad/usuarios')),
        firstValueFrom(this.http.get<Rango[]>('/api/seguridad/rangos')),
      ]);
      this.perfiles.set(perfiles);
      this.usuarios.set(usuarios);
      this.rangos.set(rangos);
      if (primera || !this.perfil()) this.perfilId.set(perfiles[0]?.id ?? '');
    } catch (e) {
      this.error.set(mensajeDe(e));
    }
  }

  protected marcar(o: PermisoOpcion, accion: (typeof ACCIONES)[number], evento: Event): void {
    o[accion] = (evento.target as HTMLInputElement).checked;
    if (accion !== 'leer' && o[accion]) o.leer = true; // sin leer la opcion no aparece en el menu
    if (accion === 'leer' && !o.leer) { o.crear = o.actualizar = o.eliminar = false; }
    this.perfiles.update((l) => [...l]);
  }

  protected async guardarPermisos(p: Perfil): Promise<void> {
    await this.ejecutar(async () => {
      await firstValueFrom(this.http.put(`/api/seguridad/perfiles/${p.id}/permisos`, { permisos: p.permisos }));
      this.exito.set(`Permisos de ${p.nombre} actualizados`);
    });
  }

  protected async crearRol(): Promise<void> {
    await this.ejecutar(async () => {
      await firstValueFrom(this.http.post('/api/seguridad/perfiles', { nombre: this.nombreRol }));
      this.nombreRol = '';
      this.exito.set('Rol creado. Seleccione sus permisos y guarde.');
      await this.cargar();
    });
  }

  protected async crearUsuario(): Promise<void> {
    const { tipo, perfilId, fuerza, rango, idFuerza, apellidos, ...comunes } = this.f;
    const cuerpo = tipo === 'web' ? { ...comunes, perfilId } : { ...comunes, apellidos, fuerza, rango, idFuerza };
    await this.ejecutar(async () => {
      await firstValueFrom(this.http.post(tipo === 'web' ? '/api/seguridad/usuarios' : '/api/seguridad/usuarios-fp', cuerpo));
      this.exito.set(`Usuario ${comunes.cedula} creado`);
      this.f = { ...formularioVacio(), tipo };
      await this.cargar();
    });
  }

  protected async desbloquear(u: UsuarioFila): Promise<void> {
    await this.ejecutar(async () => {
      await firstValueFrom(this.http.post(`/api/seguridad/usuarios/${u.tipo}/${u.id}/desbloquear`, {}));
      this.exito.set(`Usuario ${u.cedula} desbloqueado`);
      await this.cargar();
    });
  }

  private async ejecutar(accion: () => Promise<void>): Promise<void> {
    this.error.set('');
    this.exito.set('');
    try {
      await accion();
    } catch (e) {
      this.error.set(mensajeDe(e));
    }
  }
}

function mensajeDe(e: unknown): string {
  return e instanceof HttpErrorResponse ? (e.error?.error?.mensaje ?? 'No se pudo completar la operación') : 'No se pudo completar la operación';
}

// 1) Una sola pantalla con tres bloques: matriz de permisos por rol, lista de usuarios y formulario de alta.
// 2) Los botones se muestran segun el permiso del perfil sobre "seguridad"; la seguridad real es el 403 del servidor.
// 3) La matriz marca "leer" sola cuando se activa otra accion, igual que el servidor (sin leer no hay opcion en el menu).
// 4) El rol Administrador sale de solo lectura y el de Fuerza Publica muestra solo "consulta de antecedentes".
// 5) El formulario de usuario cambia segun el tipo: web pide un rol; Fuerza Publica pide fuerza, rango e identificador.
//    Los rangos vienen del catalogo de la base, asi no se puede escribir uno inexistente.
// 6) shortcut: sin editar ni desactivar usuarios existentes; solo crear, listar y desbloquear.
