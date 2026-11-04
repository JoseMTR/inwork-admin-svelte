<script>
	// CATEGORÍAS Y HABILIDADES: tipos de trabajo y oficios de los trabajadores.
	import { onMount } from 'svelte';
	import { PageHeader, StatCard, CrudCatalogo, Tarjeta, GraficoBarras, Cargando } from '#lib';
	import { api, cargarVarios } from '#lib/api.js';
	import { permiso } from '#lib/stores/sesion.js';
	import * as f from '#lib/utils/formato.js';
	import * as h from '#lib/utils/html.js';

	let cargando = $state(true);
	let d = $state({ categorias: [], habilidades: [], trabajos: [], usuariosHabilidades: [] });

	async function cargar() {
		const { datos } = await cargarVarios({
			categorias: api.get('/categorias/'),
			habilidades: api.get('/habilidades/'),
			trabajos: $permiso('trabajos') ? api.get('/trabajos/') : [],
			usuariosHabilidades: $permiso('usuarios') ? api.get('/usuarios-habilidades/') : []
		});
		d = datos;
		cargando = false;
	}

	onMount(cargar);

	const columnasCategorias = [
		{ titulo: 'Categoría', valor: (c) => c.nombre, html: (c) => h.titulo(c.nombre, c.descripcion ?? '') },
		{ titulo: 'Trabajos', valor: (c) => d.trabajos.filter((t) => t.id_categoria === c.id_categoria).length, clase: 'numero' },
		{
			titulo: 'Publicados',
			valor: (c) => d.trabajos.filter((t) => t.id_categoria === c.id_categoria && t.estado_trabajo === 'publicado').length,
			clase: 'numero'
		}
	];

	const columnasHabilidades = [
		{ titulo: 'Habilidad', valor: (x) => x.nombre, html: (x) => h.titulo(x.nombre, x.descripcion ?? '') },
		{ titulo: 'Trabajadores', valor: (x) => d.usuariosHabilidades.filter((u) => u.id_habilidad === x.id_habilidad).length, clase: 'numero' }
	];

	const campos = [
		{ nombre: 'nombre', etiqueta: 'Nombre' },
		{ nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', requerido: false }
	];

	let porCategoria = $derived(f.contarPor(d.trabajos, (t) => d.categorias.find((c) => c.id_categoria === t.id_categoria)?.nombre).slice(0, 8));
	let porHabilidad = $derived(f.contarPor(d.usuariosHabilidades, (u) => d.habilidades.find((x) => x.id_habilidad === u.id_habilidad)?.nombre).slice(0, 8));
</script>

<svelte:head>
	<title>Categorías y habilidades | InWork</title>
</svelte:head>

<div class="pagina">
	<PageHeader titulo="Categorías y habilidades" grupo="Catálogos" descripcion="Los tipos de trabajo que se pueden publicar y los oficios que registran los trabajadores." />

	{#if cargando}
		<div class="vidrio"><Cargando texto="Cargando categorías" /></div>
	{:else}
		<div class="rejilla c-3">
			<StatCard dato={{ titulo: 'Categorías', valor: d.categorias.length, icono: 'category', color: 'naranja', detalle: 'tipos de trabajo' }} />
			<StatCard dato={{ titulo: 'Habilidades', valor: d.habilidades.length, icono: 'construction', color: 'verde', detalle: 'oficios registrados' }} />
			<StatCard dato={{ titulo: 'Más solicitada', valor: porCategoria[0]?.etiqueta ?? '—', icono: 'trending_up', color: 'azul', detalle: f.cantidad(porCategoria[0]?.valor ?? 0, 'trabajo') }} />
		</div>

		<div class="rejilla c-2">
			<CrudCatalogo
				titulo="Categorías"
				subtitulo="Se eligen al publicar un trabajo"
				singular="Categoría"
				datos={d.categorias}
				columnas={columnasCategorias}
				{campos}
				ruta="/categorias/"
				clave="id_categoria"
				modulo="categorias"
				alCambiar={cargar}
			/>
			<CrudCatalogo
				titulo="Habilidades"
				subtitulo="Los oficios que tiene cada trabajador"
				singular="Habilidad"
				datos={d.habilidades}
				columnas={columnasHabilidades}
				{campos}
				ruta="/habilidades/"
				clave="id_habilidad"
				modulo="categorias"
				alCambiar={cargar}
			/>
		</div>

		<div class="rejilla c-2">
			<Tarjeta titulo="Trabajos por categoría" subtitulo="Dónde está la demanda">
				<GraficoBarras barras={porCategoria} horizontal />
			</Tarjeta>
			<Tarjeta titulo="Trabajadores por habilidad" subtitulo="Qué oficios ofrece la plataforma">
				<GraficoBarras barras={porHabilidad} horizontal color="verde" />
			</Tarjeta>
		</div>
	{/if}
</div>
