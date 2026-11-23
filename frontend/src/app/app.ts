import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  template: `<router-outlet />`,
})
export class App {}

// Componente raiz: solo aloja las rutas (login o layout con menu); app.routes.ts decide que se ve.
