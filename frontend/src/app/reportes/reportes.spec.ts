import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SesionService } from '../core/sesion.service';
import { Reportes } from './reportes';

describe('Reportes', () => {
  let control: HttpTestingController;
  let pantalla: any;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    control = TestBed.inject(HttpTestingController);
    TestBed.inject(SesionService).menu.set([
      { codigo: 'reportes', nombre: 'R', ruta: '/reportes', orden: 2, permisos: { crear: false, leer: true, actualizar: false, eliminar: false } },
    ]);
    const fixture = TestBed.createComponent(Reportes);
    fixture.detectChanges();
    pantalla = fixture.componentInstance;
  });

  it('pide el PDF con el filtro elegido y avisa que se genero', async () => {
    pantalla.filtro = 'Requerido';
    const promesa = pantalla.generar();
    const peticion = control.expectOne((r) => r.url === '/api/reportes/ciudadanos');
    expect(peticion.request.params.get('estado')).toBe('Requerido');
    peticion.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    await promesa;
    expect(pantalla.exito()).toContain('PDF');
    expect(pantalla.error()).toBe('');
  });

  it('muestra el mensaje del servidor cuando no hay resultados (404)', async () => {
    const promesa = pantalla.generar();
    const cuerpo = { error: { codigo: 'SIN_RESULTADOS', mensaje: 'No existen ciudadanos registrados que cumplan con el filtro seleccionado' } };
    control.expectOne((r) => r.url === '/api/reportes/ciudadanos').flush(
      new Blob([JSON.stringify(cuerpo)], { type: 'application/json' }),
      { status: 404, statusText: 'Not Found' },
    );
    await promesa;
    expect(pantalla.error()).toBe(cuerpo.error.mensaje);
    expect(pantalla.generando()).toBe(false);
  });
});

// Se simulan las respuestas del servidor: el PDF real y el 404 real se prueban en el backend.
