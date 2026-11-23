import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { Login } from './login';

describe('Login', () => {
  let control: HttpTestingController;
  let login: any;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    control = TestBed.inject(HttpTestingController);
    login = TestBed.createComponent(Login).componentInstance;
  });

  it('con campos vacios no llama al servidor', async () => {
    await login.ingresar();
    control.expectNone('/api/auth/login');
    expect(login.error()).toContain('Ingrese');
  });

  it('muestra el mensaje del servidor cuando las credenciales fallan', async () => {
    login.cedula = '123456';
    login.contrasena = 'mala';
    const promesa = login.ingresar();
    control.expectOne('/api/auth/login').flush(
      { error: { codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'Usuario o contraseña incorrectos' } },
      { status: 401, statusText: 'Unauthorized' },
    );
    await promesa;
    expect(login.error()).toBe('Usuario o contraseña incorrectos');
    expect(login.enviando()).toBe(false);
  });
});

// Se prueba la logica del componente (no el HTML) simulando las respuestas del servidor.
