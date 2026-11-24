import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { SesionService } from '../core/sesion.service';
import { Seguridad } from './seguridad';

const perfiles = [
  { id: 'a1', nombre: 'Administrador', descripcion: '', protegido: true, permisos: [{ codigo: 'ciudadanos', nombre: 'Ciudadanos', crear: true, leer: true, actualizar: true, eliminar: true }] },
  { id: 'b2', nombre: 'Registrador', descripcion: '', protegido: false, permisos: [{ codigo: 'ciudadanos', nombre: 'Ciudadanos', crear: false, leer: false, actualizar: false, eliminar: false }] },
];
const usuarios = [{ id: 'u1', tipo: 'web', cedula: '12345678', nombres: 'Ana', correo: 'a@x.co', rol: 'Registrador', activo: true, bloqueado: true }];

async function pintar(permisos: object) {
  TestBed.inject(SesionService).menu.set([
    { codigo: 'seguridad', nombre: 'S', ruta: '/seguridad', orden: 3, permisos: { crear: false, leer: true, actualizar: false, eliminar: false, ...permisos } },
  ]);
  const fixture = TestBed.createComponent(Seguridad);
  fixture.detectChanges();
  const control = TestBed.inject(HttpTestingController);
  control.expectOne('/api/seguridad/perfiles').flush(perfiles);
  control.expectOne('/api/seguridad/usuarios').flush(usuarios);
  control.expectOne('/api/seguridad/rangos').flush([]);
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r)); // deja resolver las promesas de firstValueFrom
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const botones = (el: HTMLElement) => Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim());

describe('Seguridad', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  });

  it('solo leer: lista usuarios pero no ofrece guardar, crear ni desbloquear', async () => {
    const el = await pintar({});
    expect(el.textContent).toContain('Ana');
    expect(botones(el)).toEqual([]);
  });

  it('administrador protegido: sus casillas salen deshabilitadas y no hay boton de guardar', async () => {
    const el = await pintar({ crear: true, actualizar: true });
    expect(el.textContent).toContain('no se puede modificar');
    expect(botones(el)).not.toContain('Guardar permisos');
    expect((el.querySelector('input[type=checkbox]') as HTMLInputElement).disabled).toBe(true);
  });

  it('con permisos: aparecen crear, desbloquear y los formularios', async () => {
    const el = await pintar({ crear: true, actualizar: true });
    expect(botones(el)).toEqual(expect.arrayContaining(['Desbloquear', 'Crear rol', 'Crear usuario']));
  });
});

// Solo se prueba que los botones dependan del permiso del perfil sobre "seguridad"; las reglas reales estan en el backend.
