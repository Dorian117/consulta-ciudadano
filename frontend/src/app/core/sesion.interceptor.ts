import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SesionService } from './sesion.service';

const URL_LOGIN = '/api/auth/login';

export const interceptorSesion: HttpInterceptorFn = (req, next) => {
  const sesion = inject(SesionService);
  const token = sesion.token();
  const esLogin = req.url === URL_LOGIN;
  const peticion = token && !esLogin ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(peticion).pipe(
    catchError((error: unknown) => {
      const codigo = error instanceof HttpErrorResponse ? error.error?.error?.codigo : undefined;
      if (!esLogin && (codigo === 'SESION_VENCIDA' || codigo === 'NO_AUTENTICADO')) {
        sesion.cerrar(codigo === 'SESION_VENCIDA' ? 'La sesión venció; inicie sesión de nuevo' : '');
      }
      return throwError(() => error);
    }),
  );
};

// 1) Agrega Authorization: Bearer <token> a toda peticion menos al login (que todavia no tiene token).
// 2) Si el servidor responde SESION_VENCIDA (o NO_AUTENTICADO, token invalido) fuera del login, se cierra la sesion
//    y se vuelve a la pantalla de login. El error se relanza para que quien llamo no crea que salio bien.
// 3) El login se excluye porque su 401 es "clave incorrecta", no "sesion vencida".
