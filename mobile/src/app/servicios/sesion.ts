import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ApiService } from './api.service';

export const interceptorToken: HttpInterceptorFn = (req, next) => {
  const api = inject(ApiService);
  const router = inject(Router);
  const esLogin = req.url.endsWith('/api/fp/login');
  const token = api.token();
  const peticion = token && !esLogin ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(peticion).pipe(
    catchError((error: unknown) => {
      const codigo = error instanceof HttpErrorResponse ? error.error?.error?.codigo : undefined;
      if (!esLogin && (codigo === 'SESION_VENCIDA' || codigo === 'NO_AUTENTICADO')) {
        api.cerrarSesion();
        void router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};

export const guardSesion: CanActivateFn = () => (inject(ApiService).token() ? true : inject(Router).createUrlTree(['/login']));

// interceptorToken: agrega Authorization: Bearer a cada peticion menos al login; si el servidor dice que la sesion
// venció o el token no sirve, cierra la sesion y vuelve al login (el error se relanza para que la pantalla no crea que salio bien).
// guardSesion: sin token no se entra a Consulta ni a Resultado.
