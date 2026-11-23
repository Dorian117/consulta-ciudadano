import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export const ESTADOS = ['Requerido', 'No requerido'] as const;
export const GRUPOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export interface Ciudadano {
  cedula: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  lugarNacimiento: string;
  genero: 'M' | 'F';
  fechaExpedicion: string;
  lugarExpedicion: string;
  grupoSanguineo: (typeof GRUPOS)[number];
  estatura: number;
  estado: (typeof ESTADOS)[number];
}

export interface PaginaCiudadanos {
  datos: Ciudadano[];
  total: number;
  pagina: number;
  limite: number;
}

const URL = '/api/ciudadanos';

@Injectable({ providedIn: 'root' })
export class CiudadanoService {
  private readonly http = inject(HttpClient);

  listar(filtro: { estado: string; q: string; pagina: number; limite: number }): Promise<PaginaCiudadanos> {
    let params = new HttpParams().set('pagina', filtro.pagina).set('limite', filtro.limite);
    if (filtro.estado) params = params.set('estado', filtro.estado);
    if (filtro.q.trim()) params = params.set('q', filtro.q.trim());
    return firstValueFrom(this.http.get<PaginaCiudadanos>(URL, { params }));
  }

  crear(c: Ciudadano): Promise<Ciudadano> {
    return firstValueFrom(this.http.post<Ciudadano>(URL, c));
  }

  actualizar(cedula: string, c: Omit<Ciudadano, 'cedula'>): Promise<Ciudadano> {
    return firstValueFrom(this.http.put<Ciudadano>(`${URL}/${cedula}`, c));
  }

  eliminar(cedula: string): Promise<unknown> {
    return firstValueFrom(this.http.delete(`${URL}/${cedula}`));
  }
}

// Capa fina sobre la API: convierte los Observables de HttpClient en promesas y arma los parametros de la URL
// (estado, busqueda, pagina, limite). No tiene logica de negocio: la validacion real esta en el servidor.
