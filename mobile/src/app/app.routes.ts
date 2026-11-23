import { Routes } from '@angular/router';
import { Consulta } from './consulta/consulta';
import { Login } from './login/login';
import { Resultado } from './resultado/resultado';
import { guardSesion } from './servicios/sesion';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'consulta', component: Consulta, canActivate: [guardSesion] },
  { path: 'resultado', component: Resultado, canActivate: [guardSesion] },
  { path: '**', redirectTo: 'consulta' },
];

// Tres pantallas: Login, Consulta y Resultado. Consulta y Resultado exigen sesion; cualquier otra ruta lleva a Consulta
// (y de ahi al Login si no hay sesion).
