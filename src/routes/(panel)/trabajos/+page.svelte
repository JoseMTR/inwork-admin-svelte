<script>
	// TRABAJOS: lo que publican los empleadores, con su detalle y un mapa real de ubicaciones.
	import { onMount } from 'svelte';
	import { PageHeader, StatCard, Tarjeta, TablaDatos, Avatar, StatusPill, MapaTrabajos, Confirmar, Cargando } from '#lib';
	import { api, cargarVarios } from '#lib/api.js';
	import { permiso } from '#lib/stores/sesion.js';
	import { avisar } from '#lib/stores/avisos.js';
	import { enfoque, tomarEnfoque } from '#lib/stores/enfoque.js';
	import { goto } from '$app/navigation';
	import * as f from '#lib/utils/formato.js';
	import * as h from '#lib/utils/html.js';

	let cargando = $state(true);
	let d = $state({ trabajos: [], usuarios: [], categorias: [], ciudades: [], ofertas: [], adjuntos: [] });
	let seleccionado = $state(null);
	let habilidades = $state([]);
	let confirmar = $state(false);
	let objetivo = $state(null);

	async function cargar() {
		const { datos } = await cargarVarios({
			trabajos: api.get('/trabajos/'),
			usuarios: $permiso('usuarios') ? api.get('/usuarios/') : [],
			categorias: $permiso('categorias') ? api.get('/categorias/') : [],
			ciudades: $permiso('ubicacion') ? api.get('/ciudades/') : [],
			ofertas: $permiso('ofertas') ? api.get('/ofertas/') : [],
			adjuntos: $permiso('adjuntos') ? api.get('/adjuntos/') : []
		});
		d = datos;
		cargando = false;
		const pedido = tomarEnfoque('trabajos');
		const id = pedido?.id_trabajo ?? seleccionado?.id_trabajo;
		elegir(d.trabajos.find((t) => t.id_trabajo === id) ?? d.trabajos[0] ?? null);
	}

	onMount(cargar);

	let usuariosPorId = $derived(f.mapaPor(d.usuarios, 'id_usuario'));
	let categoriasPorId = $derived(f.mapaPor(d.categorias, 'id_categoria'));
	let ciudadesPorId = $derived(f.mapaPor(d.ciudades, 'id_ciudad'));
	const nombre = (id) => f.nombreCompleto(usuariosPorId.get(id));
	const categoria = (id) => categoriasPorId.get(id)?.nombre ?? 'Sin categoría';
	const ciudad = (id) => ciudadesPorId.get(id)?.nombre ?? '—';
	const ofertasDe = (id) => d.ofertas.filter((o) => o.id_trabajo === id);

	let resumen = $derived([
		{ titulo: 'Trabajos', valor: d.trabajos.length, icono: 'work', color: 'naranja', detalle: 'publicados en total' },
		{ titulo: 'Publicados', valor: d.trabajos.filter((t) => t.estado_trabajo === 'publicado').length, icono: 'campaign', color: 'azul', detalle: 'esperando ofertas' },
		{ titulo: 'Asignados', valor: d.trabajos.filter((t) => t.estado_trabajo === 'asignado').length, icono: 'engineering', color: 'morado', detalle: 'con contrato activo' },
		{ titulo: 'Finalizados', valor: d.trabajos.filter((t) => t.estado_trabajo === 'finalizado').length, icono: 'task_alt', color: 'verde', detalle: 'terminados y pagados' }
	]);

	const columnas = [
		{ titulo: 'Trabajo', valor: (t) => t.titulo, html: (t) => h.titulo(t.titulo, f.cantidad(ofertasDe(t.id_trabajo).length, 'oferta')) },
		{ titulo: 'Cliente', valor: (t) => nombre(t.id_cliente) },
		{ titulo: 'Categoría', valor: (t) => categoria(t.id_categoria), html: (t) => h.chip(categoria(t.id_categoria)) },
		{ titulo: 'Ciudad', valor: (t) => ciudad(t.id_ciudad) },
		{ titulo: 'Fecha', valor: (t) => f.ordenFecha(t.fecha_trabajo), html: (t) => h.suave(f.fecha(t.fecha_trabajo), 'texto-2 fecha') },
		{ titulo: 'Presupuesto', valor: (t) => Number(t.presupuesto), html: (t) => h.dinero(t.presupuesto) },
		{ titulo: 'Estado', valor: (t) => f.textoEstado(t.estado_trabajo), html: (t) => h.pill(t.estado_trabajo) }
	];

	let acciones = $derived(
		$permiso('trabajos', 'eliminar')
			? [
					{
						texto: 'Desactivar trabajo',
						icono: 'delete',
						tono: 'peligro',
						soloIcono: true,
						mostrar: (t) => t.estado_trabajo !== 'asignado',
						alHacer: (t) => ((objetivo = t), (confirmar = true))
					}
				]
			: []
	);

	async function elegir(trabajo) {
		seleccionado = trabajo ? (d.trabajos.find((t) => t.id_trabajo === trabajo.id_trabajo) ?? trabajo) : null;
		habilidades = [];
		if (!seleccionado) return;
		try {
			const lista = await api.get(`/trabajos-habilidades/trabajo/${seleccionado.id_trabajo}`);
			habilidades = lista.map((x) => x.habilidad);
		} catch {
			habilidades = [];
		}
	}

	let ofertasSel = $derived(seleccionado ? ofertasDe(seleccionado.id_trabajo) : []);
	let fotosSel = $derived(seleccionado ? d.adjuntos.filter((a) => a.tipo_entidad === 'trabajo' && a.id_entidad === seleccionado.id_trabajo) : []);

	let porCiudad = $derived(f.contarPor(d.trabajos.filter((t) => ['publicado', 'asignado'].includes(t.estado_trabajo)), (t) => ciudad(t.id_ciudad)));

	async function eliminar() {
		await api.del(`/trabajos/${objetivo.id_trabajo}`);
		avisar(`«${objetivo.titulo}» ya no aparece en la plataforma`);
		await cargar();
	}

	function irA(modulo, ruta) {
		enfoque.set({ modulo, id_trabajo: seleccionado.id_trabajo });
		goto(ruta);
	}

	function exportar() {
		f.descargarCSV('trabajos-inwork.csv', [
			{ titulo: 'Trabajo', valor: (t) => t.titulo },
			{ titulo: 'Cliente', valor: (t) => nombre(t.id_cliente) },
			{ titulo: 'Categoría', valor: (t) => categoria(t.id_categoria) },
			{ titulo: 'Ciudad', valor: (t) => ciudad(t.id_ciudad) },
			{ titulo: 'Fecha', valor: (t) => t.fecha_trabajo },
			{ titulo: 'Presupuesto', valor: (t) => t.presupuesto },
			{ titulo: 'Estado', valor: (t) => t.estado_trabajo }
		], d.trabajos);
	}
</script>

<svelte:head>
	<title>Trabajos | InWork</title>
</svelte:head>

<div class="pagina">
	<PageHeader titulo="Trabajos" grupo="Marketplace" descripcion="Todo lo que los empleadores publican para que otras personas lo hagan.">
		<button class="boton boton-claro" type="button" onclick={exportar} disabled={cargando}>
			<span class="material-symbols-rounded">download</span>
			Exportar
		</button>
	</PageHeader>

	{#if cargando}
		<div class="vidrio"><Cargando texto="Cargando trabajos" /></div>
	{:else}
		<div class="rejilla c-4">
			{#each resumen as dato (dato.titulo)}
				<StatCard {dato} />
			{/each}
		</div>

		<Tarjeta titulo="Trabajos publicados" subtitulo="{d.trabajos.length} en total. Haz clic en uno para ver su detalle y ubicarlo en el mapa.">
			<TablaDatos datos={d.trabajos} {columnas} {acciones} alSeleccionar={elegir} {seleccionado} clave="id_trabajo" orden={[[4, 'desc']]} />
		</Tarjeta>

		{#if seleccionado}
			<Tarjeta titulo="Detalle del trabajo" subtitulo="Publicado el {f.fecha(seleccionado.created)}">
				<div class="detalle-trabajo">
					<div class="cabecera-detalle">
						<h3>{seleccionado.titulo}</h3>
						<StatusPill estado={seleccionado.estado_trabajo} />
					</div>
					<p class="texto-2">{seleccionado.descripcion}</p>

					<dl class="detalle">
						<div><dt>Cliente</dt><dd>{nombre(seleccionado.id_cliente)}</dd></div>
						<div><dt>Presupuesto</dt><dd>{f.moneda(seleccionado.presupuesto)}</dd></div>
						<div><dt>Fecha</dt><dd>{f.fecha(seleccionado.fecha_trabajo)}</dd></div>
						<div><dt>Horario</dt><dd>{f.hora(seleccionado.hora_inicio)} a {f.hora(seleccionado.hora_fin)}</dd></div>
						<div class="ancho-total"><dt>Dirección</dt><dd>{seleccionado.direccion ?? 'Sin dirección'}, {ciudad(seleccionado.id_ciudad)}</dd></div>
					</dl>

					<div>
						<span class="subtitulo-seccion">Habilidades requeridas</span>
						{#if habilidades.length}
							<div class="fila-chips">
								{#each habilidades as habilidad, i (i)}<span class="chip">{habilidad}</span>{/each}
							</div>
						{:else}
							<p class="texto-3 texto-chico">No pidió habilidades específicas.</p>
						{/if}
					</div>

					{#if $permiso('adjuntos')}
						<div>
							<span class="subtitulo-seccion">Fotos adjuntas</span>
							{#if fotosSel.length}
								<div class="fotos">
									{#each fotosSel as foto (foto.id_adjunto)}
										<a class="imagen-falsa" href={foto.url} target="_blank" rel="noopener noreferrer" title="Abrir archivo">
											<span class="material-symbols-rounded">image</span>
										</a>
									{/each}
								</div>
							{:else}
								<p class="texto-3 texto-chico">Sin fotos adjuntas.</p>
							{/if}
						</div>
					{/if}

					<div>
						<span class="subtitulo-seccion">Ofertas recibidas</span>
						{#if ofertasSel.length}
							<ul class="lista">
								{#each ofertasSel as oferta (oferta.id_oferta)}
									<li>
										<div class="celda-persona">
											<Avatar nombre={nombre(oferta.id_trabajador)} tamano="chico" />
											<div>
												<strong>{nombre(oferta.id_trabajador)}</strong>
												<small>{f.moneda(oferta.valor_oferta)}</small>
											</div>
										</div>
										<StatusPill estado={oferta.estado_oferta} />
									</li>
								{/each}
							</ul>
						{:else}
							<p class="texto-3 texto-chico">Todavía no tiene ofertas.</p>
						{/if}
					</div>

					<div class="acciones">
						{#if $permiso('ofertas')}
							<button class="boton boton-claro boton-pequeno" type="button" onclick={() => irA('ofertas', '/ofertas')}>
								<span class="material-symbols-rounded">local_offer</span>
								Ver ofertas
							</button>
						{/if}
						{#if $permiso('contrataciones') && ['asignado', 'finalizado'].includes(seleccionado.estado_trabajo)}
							<button class="boton boton-suave boton-pequeno" type="button" onclick={() => irA('contrataciones', '/contrataciones')}>
								<span class="material-symbols-rounded">handshake</span>
								Ver contratación
							</button>
						{/if}
					</div>
				</div>
			</Tarjeta>
		{/if}

		<div class="rejilla c-lateral">
			<section class="mapa vidrio">
				<MapaTrabajos trabajos={d.trabajos} {seleccionado} alSeleccionar={elegir} nombreCategoria={categoria} />
			</section>

			<Tarjeta titulo="Trabajos por ciudad" subtitulo="Publicados y asignados">
				<ul class="lista">
					{#each porCiudad as fila (fila.etiqueta)}
						<li>
							<span class="ciudad">
								<span class="material-symbols-rounded">location_city</span>
								{fila.etiqueta}
							</span>
							<strong class="numero">{fila.valor}</strong>
						</li>
					{/each}
				</ul>
				<p class="nota-mapa">El mapa usa la latitud y longitud que el empleador guardó al publicar cada trabajo.</p>
			</Tarjeta>
		</div>
	{/if}
</div>

<Confirmar
	bind:abierto={confirmar}
	titulo="Desactivar trabajo"
	texto="«{objetivo?.titulo ?? ''}» dejará de aparecer en la plataforma. Sus ofertas se conservan en la base de datos."
	textoBoton="Desactivar"
	alConfirmar={eliminar}
/>

<style>
	.detalle-trabajo {
		columns: 2 300px;
		column-gap: 36px;
	}
	.detalle-trabajo > * {
		break-inside: avoid;
		margin-bottom: 16px;
	}
	.cabecera-detalle {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 10px;
	}
	.cabecera-detalle h3 {
		font-size: 18px;
		font-weight: 800;
		letter-spacing: -0.02em;
		line-height: 1.25;
	}
	.fotos {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
	}
	.fotos .imagen-falsa {
		height: 76px;
	}
	.mapa {
		min-height: 480px;
		padding: 10px;
	}
	.ciudad {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-weight: 600;
	}
	.ciudad .material-symbols-rounded {
		color: var(--texto-3);
	}
	.nota-mapa {
		margin-top: 14px;
		font-size: 12px;
		color: var(--texto-3);
	}
</style>
