<script>
	// UBICACIÓN: países y ciudades donde funciona InWork.
	import { onMount } from 'svelte';
	import { PageHeader, StatCard, CrudCatalogo, Cargando } from '#lib';
	import { api, cargarVarios } from '#lib/api.js';
	import { permiso } from '#lib/stores/sesion.js';
	import * as f from '#lib/utils/formato.js';
	import * as h from '#lib/utils/html.js';

	let cargando = $state(true);
	let d = $state({ paises: [], ciudades: [], usuarios: [], trabajos: [] });

	async function cargar() {
		const { datos } = await cargarVarios({
			paises: api.get('/paises/'),
			ciudades: api.get('/ciudades/'),
			usuarios: $permiso('usuarios') ? api.get('/usuarios/') : [],
			trabajos: $permiso('trabajos') ? api.get('/trabajos/') : []
		});
		d = datos;
		cargando = false;
	}

	onMount(cargar);

	let paisesPorId = $derived(f.mapaPor(d.paises, 'id_pais'));

	const columnasPaises = [
		{ titulo: 'País', valor: (p) => p.nombre, html: (p) => `<strong>${f.escapar(p.nombre)}</strong>` },
		{ titulo: 'Ciudades', valor: (p) => d.ciudades.filter((c) => c.id_pais === p.id_pais).length, clase: 'numero' },
		{ titulo: 'Creado', valor: (p) => f.ordenFecha(p.created), html: (p) => h.suave(f.fecha(p.created), 'texto-3 fecha') }
	];

	const columnasCiudades = [
		{ titulo: 'Ciudad', valor: (c) => c.nombre, html: (c) => `<strong>${f.escapar(c.nombre)}</strong>` },
		{ titulo: 'País', valor: (c) => paisesPorId.get(c.id_pais)?.nombre ?? '', html: (c) => h.chip(paisesPorId.get(c.id_pais)?.nombre ?? 'Sin país', 'flag') },
		{ titulo: 'Usuarios', valor: (c) => d.usuarios.filter((u) => u.id_ciudad === c.id_ciudad).length, clase: 'numero' },
		{ titulo: 'Trabajos', valor: (c) => d.trabajos.filter((t) => t.id_ciudad === c.id_ciudad).length, clase: 'numero' }
	];

	let opcionesPaises = $derived(d.paises.map((p) => ({ valor: p.id_pais, texto: p.nombre })));
</script>

<svelte:head>
	<title>Países y ciudades | InWork</title>
</svelte:head>

<div class="pagina">
	<PageHeader titulo="Países y ciudades" grupo="Catálogos" descripcion="Los lugares donde se pueden publicar trabajos y registrar usuarios." />

	{#if cargando}
		<div class="vidrio"><Cargando texto="Cargando países y ciudades" /></div>
	{:else}
		<div class="rejilla c-3">
			<StatCard dato={{ titulo: 'Países', valor: d.paises.length, icono: 'public', color: 'azul', detalle: 'registrados' }} />
			<StatCard dato={{ titulo: 'Ciudades', valor: d.ciudades.length, icono: 'location_city', color: 'verde', detalle: 'disponibles' }} />
			<StatCard
				dato={{
					titulo: 'Ciudad con más trabajos',
					valor: f.contarPor(d.trabajos, (t) => d.ciudades.find((c) => c.id_ciudad === t.id_ciudad)?.nombre)[0]?.etiqueta ?? '—',
					icono: 'trending_up',
					color: 'naranja',
					detalle: 'según los trabajos publicados'
				}}
			/>
		</div>

		<div class="rejilla c-2">
			<CrudCatalogo
				titulo="Países"
				subtitulo="{d.paises.length} países"
				singular="País"
				datos={d.paises}
				columnas={columnasPaises}
				campos={[{ nombre: 'nombre', etiqueta: 'Nombre del país', ayuda: 'Ej: Colombia' }]}
				ruta="/paises/"
				clave="id_pais"
				modulo="ubicacion"
				alCambiar={cargar}
			/>
			<CrudCatalogo
				titulo="Ciudades"
				subtitulo="{d.ciudades.length} ciudades"
				singular="Ciudad"
				datos={d.ciudades}
				columnas={columnasCiudades}
				campos={[
					{ nombre: 'nombre', etiqueta: 'Nombre de la ciudad', ayuda: 'Ej: Sincelejo' },
					{ nombre: 'id_pais', etiqueta: 'País', tipo: 'select', opciones: opcionesPaises }
				]}
				ruta="/ciudades/"
				clave="id_ciudad"
				modulo="ubicacion"
				alCambiar={cargar}
			/>
		</div>
	{/if}
</div>
