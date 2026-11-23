import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { Ciudadanos } from './ciudadanos/ciudadanos';
import { guardOpcion } from './core/opcion.guard';
import { guardSesion } from './core/sesion.guard';
import { SesionService } from './core/sesion.service';
import { Layout } from './layout/layout';
import { Login } from './login/login';
import { Proximamente, SinAcceso } from './paginas/paginas';
import { Reportes } from './reportes/reportes';

export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: '',
    component: Layout,
    canActivate: [guardSesion],
    children: [
      { path: '', pathMatch: 'full', redirectTo: () => inject(SesionService).menu()[0]?.ruta.slice(1) ?? 'sin-acceso' },
      { path: 'ciudadanos', component: Ciudadanos, canActivate: [guardOpcion('ciudadanos')] },
      { path: 'reportes', component: Reportes, canActivate: [guardOpcion('reportes')] },
      { path: 'seguridad', component: Proximamente, canActivate: [guardOpcion('seguridad')] },
      { path: 'sin-acceso', component: SinAcceso },
    ],
  },
  { path: '**', redirectTo: '' },
];

// 1) /login es publica; todo lo demas cuelga del Layout y pasa primero por guardSesion.
// 2) La ruta vacia redirige a la primera opcion del menu del usuario (la de menor "orden"); si no tiene ninguna,
//    a /sin-acceso.
// 3) Cada opcion tiene su guardOpcion, que mira el menu del servidor. reportes y seguridad apuntan a una pagina
//    "Proximamente" porque estan fuera de alcance.
