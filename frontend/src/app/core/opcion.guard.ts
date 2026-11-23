import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { SesionService } from './sesion.service';

export const guardOpcion =
  (codigo: string): CanActivateFn =>
  () => {
    const sesion = inject(SesionService);
    return sesion.puede(codigo, 'leer') ? true : inject(Router).createUrlTree(['/']);
  };

// Evita entrar escribiendo la direccion a mano en una opcion que el perfil no tiene. Es comodidad:
// aunque se saltara, el servidor responde 403 SIN_PERMISO en cada peticion.
