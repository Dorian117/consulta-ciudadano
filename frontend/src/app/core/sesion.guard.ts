import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { SesionService } from './sesion.service';

export const guardSesion: CanActivateFn = async () => {
  const sesion = inject(SesionService);
  const router = inject(Router);

  if (!sesion.token()) return router.createUrlTree(['/login']);
  if (!sesion.usuario()) {
    try {
      await sesion.restaurar();
    } catch {
      return router.createUrlTree(['/login']);
    }
  }
  return true;
};

// 1) Protege las rutas que requieren estar dentro: sin token manda al login.
// 2) Si hay token pero no hay usuario cargado (se recargo la pagina), lo restaura con /api/auth/yo y /api/auth/menu.
//    Si el servidor rechaza el token, el interceptor ya cerro la sesion y aqui solo se redirige.
