import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { urlApi } from '../config';

export interface Agente {
  cedula: string;
  nombres: string;
  apellidos: string;
  fuerza: string;
  rango: string;
}

export interface ResultadoConsulta {
  cedula: string;
  estado: 'Requerido' | 'No requerido' | 'No encontrado';
  nombres?: string;
  apellidos?: string;
}

const CLAVE = 'token-fp';

function leer(): string | null {
  try {
    return sessionStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  readonly token = signal<string | null>(leer());
  readonly agente = signal<Agente | null>(null);
  readonly resultado = signal<ResultadoConsulta | null>(null);

  async iniciarSesion(cedula: string, contrasena: string): Promise<void> {
    const r = await firstValueFrom(
      this.http.post<{ token: string; usuario: Agente }>(`${urlApi()}/api/fp/login`, { cedula, contrasena }),
    );
    this.guardar(r.token);
    this.agente.set(r.usuario);
  }

  async consultar(cedula: string): Promise<ResultadoConsulta> {
    const r = await firstValueFrom(this.http.get<ResultadoConsulta>(`${urlApi()}/api/consulta/${cedula}`));
    this.resultado.set(r);
    return r;
  }

  cerrarSesion(): void {
    this.guardar(null);
    this.agente.set(null);
    this.resultado.set(null);
  }

  private guardar(token: string | null): void {
    this.token.set(token);
    try {
      if (token) sessionStorage.setItem(CLAVE, token);
      else sessionStorage.removeItem(CLAVE);
    } catch {
      // sin almacenamiento la sesion vive solo en memoria
    }
  }
}

// 1) Un solo servicio para hablar con la API (login y consulta) y guardar la sesion; la app es pequena y no necesita mas capas.
// 2) El token se guarda en sessionStorage del WebView: se pierde al cerrar la app. shortcut: para recordar la sesion entre
//    aperturas habria que usar el almacenamiento seguro del telefono (Keystore); aqui se prefiere pedir la clave de nuevo.
// 3) Los mensajes de error (clave incorrecta, cuenta bloqueada, etc.) los escribe el servidor y la pantalla los muestra tal cual.
