import { Component } from '@angular/core';

@Component({
  selector: 'app-proximamente',
  template: `
    <h2>Próximamente</h2>
    <p>Esta opción está fuera del alcance de esta entrega y se desarrollará más adelante.</p>
  `,
})
export class Proximamente {}

@Component({
  selector: 'app-sin-acceso',
  template: `
    <h2>Sin opciones disponibles</h2>
    <p>Su perfil no tiene opciones habilitadas. Comuníquese con el administrador.</p>
  `,
})
export class SinAcceso {}

// Proximamente: reportes (HU04) y seguridad (HU10) quedan fuera de esta entrega (ver docs/PENDIENTES.md).
// SinAcceso: se muestra cuando el menu del perfil llega vacio, para que la pantalla no quede en blanco.
