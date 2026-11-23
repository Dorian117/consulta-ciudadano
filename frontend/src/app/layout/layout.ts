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
      padding: 0.75rem 1.5rem; background: var(--superficie); border-top: 3px solid var(--granate); border-bottom: 1px solid var(--linea); }
    .barra .marca { font-size: 1.5rem; margin: 0; color: var(--granate); }
    .usuario { display: flex; align-items: center; gap: 0.6rem; color: var(--suave); font-size: 0.92rem; }
    .usuario em { color: var(--tinta); }
    .usuario .boton { padding: 0.3rem 0.8rem; font-size: 0.88rem; }
    .cuerpo { display: grid; grid-template-columns: 230px 1fr; min-height: calc(100vh - 58px); }
    nav { display: flex; flex-direction: column; gap: 0.15rem; padding: 1.25rem 0; background: var(--superficie); border-right: 1px solid var(--linea); }
    nav a { padding: 0.6rem 1.5rem; color: var(--tinta); text-decoration: none; border-left: 3px solid transparent; }
    nav a:hover { background: var(--realce); }
    nav a.activa { background: var(--realce); border-left-color: var(--granate); font-weight: 600; color: var(--granate); }
    main { padding: 1.75rem 2rem; min-width: 0; }
    @media (max-width: 700px) {
      .cuerpo { grid-template-columns: 1fr; }
      nav { flex-direction: row; flex-wrap: wrap; padding: 0.5rem; border-right: 0; border-bottom: 1px solid var(--linea); }
      nav a { padding: 0.5rem 0.9rem; border-left: 0; border-bottom: 3px solid transparent; }
      nav a.activa { border-bottom-color: var(--granate); }
      main { padding: 1.25rem 1rem; }
    }
  `,
})
export class Layout {
  protected readonly sesion = inject(SesionService);
}

// 1) El menu NO esta escrito en el codigo: se dibuja con lo que devolvio /api/auth/menu. Si al perfil le quitan
//    una opcion, deja de aparecer sin tocar el frontend.
// 2) En pantallas angostas el menu pasa a una fila superior (responsive) para que tambien sirva en el celular.
