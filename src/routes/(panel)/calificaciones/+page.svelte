<script>
	// CALIFICACIONES: lo que opinan clientes y trabajadores entre sí después de cada trabajo.
	import { onMount } from 'svelte';
	import { PageHeader, StatCard, Tarjeta, TablaDatos, GraficoBarras, Avatar, Confirmar, Cargando } from '#lib';
	import { api, cargarVarios } from '#lib/api.js';
	import { permiso } from '#lib/stores/sesion.js';
	import { avisar } from '#lib/stores/avisos.js';
	import * as f from '#lib/utils/formato.js';
	import * as h from '#lib/utils/html.js';

	let cargando = $state(true);
	let d = $state({ calificaciones: [], usuarios: [], trabajos: [], reportes: [] });
	let confirmar = $state(false);
	let objetivo = $state(null);

	async function cargar() {
		const { datos } = await cargarVarios({
			calificaciones: api.get('/calificaciones/'),
			usuarios: $permiso('usuarios') ? api.get('/usuarios/') : [],
			trabajos: $permiso('trabajos') ? api.get('/trabajos/') : [],
			reportes: $permiso('reportes') ? api.get('/reportes/') : []
		});
		d = datos;
		cargando = false;
	}

	onMount(cargar);

	let usuariosPorId = $derived(f.mapaPor(d.usuarios, 'id_usuario'));
	let trabajosPorId = $derived(f.mapaPor(d.trabajos, 'id_trabajo'));
	const nombre = (id) => f.nombreCompleto(usuariosPorId.get(id));
	const trabajo = (id) => trabajosPorId.get(id)?.titulo ?? 'Trabajo';

	let promedio = $derived(f.promedio(d.calificaciones, (c) => c.puntuacion));
	let cinco = $derived(d.calificaciones.filter((c) => c.puntuacion === 5).length);

	let resumen = $derived([
		{ titulo: 'Promedio general', valor: f.decimal(promedio), icono: 'star', color: 'ambar', detalle: 'de 5 estrellas' },
		{ titulo: 'Reseñas', valor: f.numero(d.calificaciones.length), icono: 'reviews', color: 'azul', detalle: 'entre clientes y trabajadores' },
		{ titulo: 'Con 5 estrellas', valor: f.porcentaje(cinco, d.calificaciones.length), icono: 'thumb_up', color: 'verde', detalle: `${f.cantidad(cinco, 'reseña perfecta', 'reseñas perfectas')}` }
	]);

	let distribucion = $derived([5, 4, 3, 2, 1].map((n) => ({ etiqueta: `${n} estrella${n === 1 ? '' : 's'}`, valor: d.calificaciones.filter((c) => c.puntuacion === n).length })));

	// Usuarios con peor promedio (para vigilarlos)
	let vigilados = $derived(
		d.usuarios
			.filter((u) => Number(u.total_calificaciones) > 0)
			.sort((a, b) => Number(a.promedio_calificacion) - Number(b.promedio_calificacion))
			.slice(0, 5)
			.map((u) => ({
				nombre: f.nombreCompleto(u),
				promedio: Number(u.promedio_calificacion).toFixed(1),
				resenas: u.total_calificaciones,
				reportes: d.reportes.filter((r) => r.id_reportado === u.id_usuario).length
			}))
	);

	const columnas = [
		{ titulo: 'Calificador', valor: (c) => nombre(c.id_calificador), html: (c) => h.persona(nombre(c.id_calificador), trabajo(c.id_trabajo)) },
		{ titulo: 'Calificado', valor: (c) => nombre(c.id_calificado), html: (c) => `<strong>${f.escapar(nombre(c.id_calificado))}</strong>` },
		{ titulo: 'Puntuación', valor: (c) => c.puntuacion, html: (c) => h.estrellas(c.puntuacion) },
		{ titulo: 'Comentario', valor: (c) => c.comentario ?? '', html: (c) => h.recortado(c.comentario ?? 'Sin comentario') },
		{ titulo: 'Fecha', valor: (c) => f.ordenFecha(c.created), html: (c) => h.suave(f.fecha(c.created), 'texto-3 fecha') }
	];

	let acciones = $derived(
		$permiso('calificaciones', 'eliminar')
			? [{ texto: 'Eliminar reseña', icono: 'delete', tono: 'peligro', soloIcono: true, alHacer: (c) => ((objetivo = c), (confirmar = true)) }]
			: []
	);

	async function eliminar() {
		await api.del(`/calificaciones/${objetivo.id_calificacion}`);
		avisar('Reseña eliminada. El promedio del usuario se recalculó.');
		await cargar();
	}
</script>

<svelte:head>
	<title>Calificaciones | InWork</title>
</svelte:head>

<div class="pagina">
	<PageHeader titulo="Calificaciones" grupo="Personas" descripcion="Lo que opinan clientes y trabajadores entre sí después de cada trabajo.">
		{#if !$permiso('calificaciones', 'eliminar')}
			<span class="solo-lectura"><span class="material-symbols-rounded">visibility</span>Solo lectura</span>
		{/if}
	</PageHeader>

	{#if cargando}
		<div class="vidrio"><Cargando texto="Cargando reseñas" /></div>
	{:else}
		<div class="rejilla c-3">
			{#each resumen as dato (dato.titulo)}
				<StatCard {dato} />
			{/each}
		</div>

		<div class="rejilla c-ancha">
			<Tarjeta titulo="Reseñas" subtitulo="Las más recientes primero">
				<TablaDatos datos={d.calificaciones} {columnas} {acciones} orden={[[4, 'desc']]} />
			</Tarjeta>

			<div class="lateral">
				<Tarjeta titulo="Distribución por estrellas" subtitulo="{d.calificaciones.length} reseñas">
					<GraficoBarras barras={distribucion} horizontal color="ambar" />
				</Tarjeta>

				<Tarjeta titulo="Usuarios a vigilar" subtitulo="Peor promedio entre quienes tienen reseñas">
					{#if vigilados.length === 0}
						<p class="texto-3">Nadie tiene reseñas todavía.</p>
					{:else}
						<ul class="lista">
							{#each vigilados as usuario, i (i)}
								<li>
									<div class="celda-persona">
										<Avatar nombre={usuario.nombre} tamano="chico" />
										<div>
											<strong>{usuario.nombre}</strong>
											<small>{f.cantidad(usuario.resenas, 'reseña')}, {f.cantidad(usuario.reportes, 'reporte')}</small>
										</div>
									</div>
									<span class="promedio" class:bajo={Number(usuario.promedio) < 4}>{usuario.promedio}</span>
								</li>
							{/each}
						</ul>
					{/if}
				</Tarjeta>
			</div>
		</div>
	{/if}
</div>

<Confirmar
	bind:abierto={confirmar}
	titulo="Eliminar reseña"
	texto="Se eliminará la reseña de {objetivo ? nombre(objetivo.id_calificador) : ''} y se recalculará el promedio de {objetivo ? nombre(objetivo.id_calificado) : ''}."
	textoBoton="Eliminar"
	alConfirmar={eliminar}
/>

<style>
	.lateral {
		display: flex;
		flex-direction: column;
		gap: 20px;
		min-width: 0;
	}
	.promedio {
		display: inline-grid;
		place-items: center;
		min-width: 42px;
		height: 28px;
		padding: 0 8px;
		border-radius: 9px;
		font-weight: 800;
		color: var(--ambar);
		background: var(--ambar-suave);
	}
	.promedio.bajo {
		color: var(--rojo);
		background: var(--rojo-suave);
	}
</style>
