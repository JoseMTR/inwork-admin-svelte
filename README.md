# InWork · Panel de administración (Svelte)

Panel web de InWork para los roles **Administrador**, **Moderador** y **Analista**.
Hecho con SvelteKit (Svelte 5) y conectado a las dos APIs en la nube:

| API | URL |
|---|---|
| Principal (FastAPI + PostgreSQL) | https://backend-inwork.onrender.com |
| Pagos y custodia (Express + MySQL) | https://backend-pagos-wauv.onrender.com |

## Cómo ejecutarlo

```bash
npm install
npm run dev
```

Abre http://localhost:5173. La primera petición puede tardar unos 40 segundos si Render tiene las APIs dormidas.

### Cuentas de prueba (contraseña `Inwork2026*`)

| Rol | Correo |
|---|---|
| Administrador | sebastian.rojas@inwork.com.co |
| Moderador | mariana.castro@inwork.com.co |
| Analista | jorge.pertuz@inwork.com.co |

Los empleadores y empleados (roles 4 y 5) no pueden entrar al panel.

## Cómo funciona

- **Login con JWT**: `POST /auth/login` devuelve el token. Se guarda en `localStorage` (con "Recordarme") o en `sessionStorage`, y se envía en cada petición como `Authorization: Bearer <token>`. El mismo token sirve en la API de pagos. Si la API responde 401 (token vencido o rol cambiado) se cierra la sesión.
- **Menú desde la base de datos**: después del login se llama `GET /auth/mis-modulos`, que lee la tabla `rol_modulo`. El menú, las rutas permitidas y los botones (crear, editar, eliminar) salen de esa tabla. Si el administrador cambia un permiso en *Roles y permisos*, el otro rol lo ve al recargar.
- **Sin IDs en pantalla**: las tablas muestran nombres, títulos y fechas. Los formularios usan listas desplegables con nombres en vez de campos para escribir IDs.
- **Tablas**: todas usan la librería DataTables (buscar, ordenar y paginar).

## Estructura

```
src/
  app.html              CDN de Bootstrap, jQuery, DataTables, Leaflet y fuentes
  app.css               Estilos globales (colores de la propuesta)
  lib/
    api.js              Cliente HTTP de las dos APIs (token, errores, caché corta)
    config.js           URLs de las APIs
    components/         Componentes reutilizables
    stores/             sesion, avisos y enfoque
    utils/              formato, html para celdas y menú
  routes/
    +page.svelte        Login
    +error.svelte       Página 404
    (panel)/            Páginas protegidas (una carpeta por módulo)
```

### Componentes reutilizables

Avatar, Avisos, Cargando, ChatBubble, Confirmar, CrudCatalogo, EmptyState, Footer, GraficoArea, GraficoBarras, GraficoDona, MapaTrabajos, Modal, PageHeader, RoleSelector, Sidebar, SinPermiso, StatCard, StatusPill, TablaDatos, Tarjeta y Topbar.

## Publicarlo en la nube (Render)

El proyecto usa `@sveltejs/adapter-static`: `npm run build` genera la carpeta `build` con un sitio estático. Todas las rutas se abren desde `build/200.html`, porque el panel no usa SSR. Render lo publica gratis como **Static Site**, y ese tipo de sitio no se duerme.

1. Sube el proyecto a un repositorio de GitHub.
2. En render.com elige **New → Static Site** y conecta el repositorio.
3. Configura:
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `build`
4. En **Redirects/Rewrites** agrega una regla:

   | Source | Destination | Action |
   |---|---|---|
   | `/*` | `/200.html` | Rewrite |

   Sin esta regla, al recargar una página como `/usuarios` Render responde 404.
5. Opcional: en **Environment** puedes poner `VITE_API_URL` y `VITE_API_PAGOS_URL` para usar otras URLs de las APIs. Si no las pones, se usan las de Render que ya están en `src/lib/config.js`.

El archivo `.node-version` le dice a Render que use Node 22.

Las dos APIs ya permiten peticiones desde cualquier dominio (CORS), así que no hay que cambiarlas.
