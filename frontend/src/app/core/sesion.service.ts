import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

export type Accion = 'crear' | 'leer' | 'actualizar' | 'eliminar';

export interface Usuario {
  cedula: string;
  nombres: string;
  perfil: string;
}

export interface ItemMenu {
  codigo: string;
  nombre: string;
  ruta: string;
  orden: number;
  permisos: Record<Accion, boolean>;
}

const CLAVE = 'token';

function leerToken(): string | null {
  try {
    return sessionStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly token = signal<string | null>(leerToken());
  readonly usuario = signal<Usuario | null>(null);
  readonly menu = signal<ItemMenu[]>([]);
  /** Aviso para la pantalla de login (por ejemplo "La sesión venció"). */
  readonly aviso = signal('');

  async iniciar(cedula: string, contrasena: string): Promise<void> {
    const r = await firstValueFrom(
      this.http.post<{ token: string; usuario: Usuario }>('/api/auth/login', { cedula, contrasena }),
    );
    this.guardar(r.token);
    this.usuario.set(r.usuario);
    this.aviso.set('');
    await this.cargarMenu();
  }

  /** Tras recargar la pagina el token sigue, pero usuario y menu hay que pedirlos de nuevo. */
  async restaurar(): Promise<void> {
    const [usuario] = await Promise.all([firstValueFrom(this.http.get<Usuario>('/api/auth/yo')), this.cargarMenu()]);
    this.usuario.set(usuario);
  }

  private async cargarMenu(): Promise<void> {
    this.menu.set(await firstValueFrom(this.http.get<ItemMenu[]>('/api/auth/menu')));
  }

  puede(codigo: string, accion: Accion): boolean {
    return this.menu().find((o) => o.codigo === codigo)?.permisos[accion] ?? false;
  }

  cerrar(aviso = ''): void {
    this.guardar(null);
    this.usuario.set(null);
    this.menu.set([]);
    this.aviso.set(aviso);
    void this.router.navigate(['/login']);
  }

  private guardar(token: string | null): void {
    this.token.set(token);
    try {
      if (token) sessionStorage.setItem(CLAVE, token);
      else sessionStorage.removeItem(CLAVE);
    } catch {
      // sin almacenamiento disponible la sesion vive solo en memoria
    }
  }
}

// 1) El token se guarda en sessionStorage: sobrevive a recargar la pagina pero se pierde al cerrar la pestana.
//    shortcut: sessionStorage es legible por cualquier script de la pagina (riesgo XSS); la alternativa seria una
//    cookie httpOnly, que exige cambios en el backend.
// 2) usuario y menu son signals: las pantallas se actualizan solas cuando cambian.
// 3) puede(codigo, accion) responde segun el menu que mando el servidor. Solo sirve para mostrar u ocultar botones;
//    la seguridad real la aplica el servidor en cada peticion.
// 4) cerrar() limpia todo y manda al login, con un aviso opcional que el login muestra.
