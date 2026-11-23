import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SesionService } from '../core/sesion.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="barra">
      <span class="marca">Consulta de Ciudadanos</span>
      <span class="usuario">
        {{ sesion.usuario()?.nombres }} · <em>{{ sesion.usuario()?.perfil }}</em>
        <button class="boton secundario" type="button" (click)="sesion.cerrar()">Salir</button>
      </span>
    </header>
    <div class="cuerpo">
      <nav aria-label="Menú principal">
        @for (opcion of sesion.menu(); track opcion.codigo) {
          <a [routerLink]="opcion.ruta" routerLinkActive="activa">{{ opcion.nombre }}</a>
        }
      </nav>
      <main><router-outlet /></main>
    </div>
  `,
  styles: `
    .barra { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;
      padding: 0.7rem 1.25rem; background: var(--primario); color: #fff; }
    .barra .marca { font-size: 1.4rem; margin: 0; }
    .usuario { display: flex; align-items: center; gap: 0.6rem; }
    .usuario .boton { background: transparent; color: #fff; border-color: #fff; padding: 0.3rem 0.8rem; }
    .cuerpo { display: grid; grid-template-columns: 230px 1fr; min-height: calc(100vh - 56px); }
    nav { display: flex; flex-direction: column; gap: 0.25rem; padding: 1rem; background: var(--superficie); border-right: 1px solid var(--borde); }
    nav a { padding: 0.6rem 0.8rem; border-radius: 6px; color: var(--texto); text-decoration: none; }
    nav a:hover { background: var(--borde); }
    nav a.activa { background: var(--acento); font-weight: 600; }
    main { padding: 1.5rem; min-width: 0; }
    @media (max-width: 700px) {
      .cuerpo { grid-template-columns: 1fr; }
      nav { flex-direction: row; flex-wrap: wrap; border-right: 0; border-bottom: 1px solid var(--borde); }
    }
  `,
})
export class Layout {
  protected readonly sesion = inject(SesionService);
}

// 1) El menu NO esta escrito en el codigo: se dibuja con lo que devolvio /api/auth/menu. Si al perfil le quitan
//    una opcion, deja de aparecer sin tocar el frontend.
// 2) En pantallas angostas el menu pasa a una fila superior (responsive) para que tambien sirva en el celular.
