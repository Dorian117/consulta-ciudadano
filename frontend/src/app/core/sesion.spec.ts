import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { interceptorSesion } from './sesion.interceptor';
import { SesionService } from './sesion.service';

describe('sesion', () => {
  let http: HttpClient;
  let control: HttpTestingController;
  let sesion: SesionService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([interceptorSesion])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    control = TestBed.inject(HttpTestingController);
    sesion = TestBed.inject(SesionService);
  });

  it('agrega el token a las peticiones y no al login', () => {
    sesion.token.set('abc');
    http.get('/api/ciudadanos').subscribe();
    expect(control.expectOne('/api/ciudadanos').request.headers.get('Authorization')).toBe('Bearer abc');
    http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    expect(control.expectOne('/api/auth/login').request.headers.has('Authorization')).toBe(false);
  });

  it('SESION_VENCIDA cierra la sesion y vuelve al login', () => {
    const ir = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    sesion.token.set('abc');
    http.get('/api/ciudadanos').subscribe({ error: () => undefined });
    control
      .expectOne('/api/ciudadanos')
      .flush({ error: { codigo: 'SESION_VENCIDA', mensaje: 'x' } }, { status: 401, statusText: 'Unauthorized' });
    expect(sesion.token()).toBeNull();
    expect(sesion.aviso()).toContain('venció');
    expect(ir).toHaveBeenCalledWith(['/login']);
  });

  it('puede() responde segun el menu', () => {
    sesion.menu.set([
      { codigo: 'ciudadanos', nombre: 'C', ruta: '/ciudadanos', orden: 1, permisos: { crear: true, leer: true, actualizar: false, eliminar: false } },
    ]);
    expect(sesion.puede('ciudadanos', 'crear')).toBe(true);
    expect(sesion.puede('ciudadanos', 'eliminar')).toBe(false);
    expect(sesion.puede('reportes', 'leer')).toBe(false);
  });
});

// Pruebas del interceptor y del servicio de sesion con HttpTestingController: no hay red, se simulan las respuestas.
// La integracion real con la API se comprueba aparte, a traves del proxy del servidor de desarrollo.
