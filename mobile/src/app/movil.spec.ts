import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor-mlkit/barcode-scanning', () => ({
  BarcodeFormat: { Code128: 'Code128', Pdf417: 'Pdf417' },
  BarcodeScanner: { scan: vi.fn() },
}));
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Consulta, cedulaDeCodigo, ESPERA_MANUAL_MS } from './consulta/consulta';
import { Login } from './login/login';
import { ApiService } from './servicios/api.service';
import { interceptorToken } from './servicios/sesion';

function preparar() {
  sessionStorage.clear();
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(withInterceptors([interceptorToken])), provideHttpClientTesting()],
  });
  vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  return { api: TestBed.inject(ApiService), control: TestBed.inject(HttpTestingController) };
}

describe('cedulaDeCodigo', () => {
  it('acepta de 6 a 10 digitos y rechaza el resto', () => {
    expect(cedulaDeCodigo(' 1234567890 ')).toBe('1234567890');
    expect(cedulaDeCodigo('123456')).toBe('123456');
    expect(cedulaDeCodigo('12345')).toBeNull();
    expect(cedulaDeCodigo('12345678901')).toBeNull();
    expect(cedulaDeCodigo('12ab5678')).toBeNull();
    expect(cedulaDeCodigo(undefined)).toBeNull();
  });
});

describe('ApiService e interceptor', () => {
  it('el login guarda el token y la consulta lo envia como Bearer', async () => {
    const { api, control } = preparar();
    const login = api.iniciarSesion('2000000001', 'x');
    const p = control.expectOne((r) => r.url.endsWith('/api/fp/login'));
    expect(p.request.headers.has('Authorization')).toBe(false);
    p.flush({ token: 'abc', usuario: { cedula: '2000000001', nombres: 'Diego', apellidos: 'P', fuerza: 'Policia', rango: 'Patrullero' } });
    await login;

    const consulta = api.consultar('1000000001');
    const c = control.expectOne((r) => r.url.endsWith('/api/consulta/1000000001'));
    expect(c.request.headers.get('Authorization')).toBe('Bearer abc');
    c.flush({ cedula: '1000000001', estado: 'Requerido', nombres: 'Ana', apellidos: 'Perez' });
    await consulta;
    expect(api.resultado()?.estado).toBe('Requerido');
  });

  it('SESION_VENCIDA cierra la sesion y vuelve al login', async () => {
    const { api, control } = preparar();
    api.token.set('abc');
    const consulta = api.consultar('1000000001').catch(() => undefined);
    control.expectOne((r) => r.url.includes('/api/consulta/')).flush(
      { error: { codigo: 'SESION_VENCIDA', mensaje: 'x' } }, { status: 401, statusText: 'Unauthorized' });
    await consulta;
    expect(api.token()).toBeNull();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/login']);
  });
});

describe('Login', () => {
  it('muestra el mensaje del servidor', async () => {
    const { control } = preparar();
    const pantalla: any = TestBed.createComponent(Login).componentInstance;
    pantalla.cedula = '2000000001';
    pantalla.contrasena = 'mala';
    const p = pantalla.ingresar();
    control.expectOne((r) => r.url.endsWith('/api/fp/login')).flush(
      { error: { codigo: 'CUENTA_BLOQUEADA', mensaje: 'La cuenta esta bloqueada' } }, { status: 423, statusText: 'Locked' });
    await p;
    expect(pantalla.error()).toBe('La cuenta esta bloqueada');
  });
});

describe('Consulta', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('la digitacion manual aparece a los 10 segundos', () => {
    preparar();
    const f = TestBed.createComponent(Consulta);
    f.detectChanges();
    const pantalla: any = f.componentInstance;
    expect(pantalla.manual()).toBe(false);
    vi.advanceTimersByTime(ESPERA_MANUAL_MS);
    expect(pantalla.manual()).toBe(true);
  });

  it('un codigo que no es cedula muestra aviso y habilita la digitacion', async () => {
    preparar();
    vi.mocked(BarcodeScanner.scan).mockResolvedValue({ barcodes: [{ rawValue: 'ABC-123' }] } as never);
    const f = TestBed.createComponent(Consulta);
    f.detectChanges();
    const pantalla: any = f.componentInstance;
    await pantalla.escanear();
    expect(pantalla.aviso()).toContain('no es una identificación válida');
    expect(pantalla.manual()).toBe(true);
  });

  it('un codigo valido consulta la cedula y va al resultado', async () => {
    const { control } = preparar();
    vi.mocked(BarcodeScanner.scan).mockResolvedValue({ barcodes: [{ rawValue: '1000000001' }] } as never);
    const f = TestBed.createComponent(Consulta);
    f.detectChanges();
    const pantalla: any = f.componentInstance;
    const p = pantalla.escanear();
    await vi.waitFor(() => control.expectOne((r) => r.url.endsWith('/api/consulta/1000000001')).flush({ cedula: '1000000001', estado: 'No requerido', nombres: 'Ana', apellidos: 'P' }));
    await p;
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/resultado']);
  });

  it('si el escaner falla (sin camara) avisa y habilita la digitacion', async () => {
    preparar();
    vi.mocked(BarcodeScanner.scan).mockRejectedValue(new Error('sin camara'));
    const f = TestBed.createComponent(Consulta);
    f.detectChanges();
    const pantalla: any = f.componentInstance;
    await pantalla.escanear();
    expect(pantalla.manual()).toBe(true);
  });
});

// Se prueba la logica (lectura, validacion, plazo de 10 s, sesion). El lector real y la camara solo se pueden probar en
// un telefono; aqui el plugin se sustituye por un doble.
