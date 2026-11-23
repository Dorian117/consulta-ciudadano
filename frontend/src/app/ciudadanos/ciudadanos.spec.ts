import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { SesionService, type ItemMenu } from '../core/sesion.service';
import { Ciudadanos } from './ciudadanos';

const fila = {
  cedula: '12345678', nombres: 'Ana', apellidos: 'Perez', fechaNacimiento: '1990-05-20T00:00:00.000Z',
  lugarNacimiento: 'Bogota', genero: 'F', fechaExpedicion: '2008-06-01T00:00:00.000Z', lugarExpedicion: 'Bogota',
  grupoSanguineo: 'O+', estatura: 1.65, estado: 'Requerido',
};

function menuCon(permisos: Partial<ItemMenu['permisos']>): ItemMenu[] {
  return [{ codigo: 'ciudadanos', nombre: 'C', ruta: '/ciudadanos', orden: 1,
    permisos: { crear: false, leer: true, actualizar: false, eliminar: false, ...permisos } }];
}

async function pintar(permisos: Partial<ItemMenu['permisos']>) {
  TestBed.inject(SesionService).menu.set(menuCon(permisos));
  const fixture = TestBed.createComponent(Ciudadanos);
  fixture.detectChanges();
  const control = TestBed.inject(HttpTestingController);
  control.expectOne((r) => r.url === '/api/ciudadanos').flush({ datos: [fila], total: 1, pagina: 1, limite: 10 });
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const textosBotones = (el: HTMLElement) => Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim());

describe('Ciudadanos (botones segun permisos)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  });

  it('solo leer: muestra la fila y ningun boton de crear, editar o eliminar', async () => {
    const el = await pintar({});
    expect(el.textContent).toContain('Perez');
    const botones = textosBotones(el);
    expect(botones).not.toContain('Nuevo ciudadano');
    expect(botones).not.toContain('Editar');
    expect(botones).not.toContain('Eliminar');
  });

  it('con todos los permisos: aparecen los tres botones', async () => {
    const el = await pintar({ crear: true, actualizar: true, eliminar: true });
    const botones = textosBotones(el);
    expect(botones).toContain('Nuevo ciudadano');
    expect(botones).toContain('Editar');
    expect(botones).toContain('Eliminar');
  });

  it('eliminar pide confirmacion antes de llamar al servidor', async () => {
    const el = await pintar({ eliminar: true });
    const control = TestBed.inject(HttpTestingController);
    (Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Eliminar') as HTMLButtonElement).click();
    await Promise.resolve();
    control.expectNone((r) => r.method === 'DELETE');
  });
});

// Se comprueba que los botones dependan del menu del servidor y que eliminar no dispare la peticion con un solo clic.
// La seguridad real (403) se prueba en el backend; aqui solo se prueba la comodidad visual.
