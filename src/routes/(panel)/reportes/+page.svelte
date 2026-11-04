<script>
	// REPORTES: denuncias entre usuarios. El moderador los toma, los resuelve o los rechaza.
	import { onMount } from 'svelte';
	import { PageHeader, StatCard, Tarjeta, TablaDatos, Avatar, StatusPill, Confirmar, Cargando, EmptyState } from '#lib';
	import { api, cargarVarios } from '#lib/api.js';
	import { sesion, permiso } from '#lib/stores/sesion.js';
	import { avisar } from '#lib/stores/avisos.js';
	import { enfoque, tomarEnfoque } from '#lib/stores/enfoque.js';
	import { goto } from '$app/navigation';
	import * as f from '#lib/utils/formato.js';
	import * as h from '#lib/utils/html.js';

	const MOTIVOS = {
		fraude: 'Fraude',
		incumplimiento: 'Incumplimiento',
		lenguaje_inapropiado: 'Lenguaje inapropiado',
		estafa: 'Estafa',
		suplantacion: 'Suplantación',
		otro: 'Otro'
	};

	let cargando = $state(true);
	let d = $state({ reportes: [], usuarios: [], trabajos: [], adjuntos: [] });
	let seleccionado = $state(null);
	let resolucion = $state('');
	let guardando = $state(false);
	let error = $state('');
	let confirmarSuspender = $state(false);

	// El cambio de estado del reporte lo hacen administrador y moderador
	let puedeGestionar = $derived($permiso('reportes', 'editar') && [1, 2].includes($sesion?.id_rol));

	async function cargar() {
		const { datos } = await cargarVarios({
			reportes: api.get('/reportes/'),
			usuarios: $permiso('usuarios') ? api.get('/usuarios/') : [],
			trabajos: $permiso('trabajos') ? api.get('/trabajos/') : [],
			adjuntos: $permiso('adjuntos') ? api.get('/adjuntos/') : []
		});
		d = datos;
		cargando = false;
		const pedido = tomarEnfoque('reportes');
		const id = pedido?.id_reporte ?? seleccionado?.id_reporte;
		const pendientes = [...d.reportes].filter((r) => r.estado_reporte === 'pendiente').sort((a, b) => f.ordenFecha(a.created) - f.ordenFecha(b.created));
		elegir(d.reportes.find((r) => r.id_reporte === id) ?? pendientes[0] ?? d.reportes[0] ?? null);
	}

	onMount(cargar);

	let usuariosPorId = $derived(f.mapaPor(d.usuarios, 'id_usuario'));
	let trabajosPorId = $derived(f.mapaPor(d.trabajos, 'id_trabajo'));
	const nombre = (id) => f.nombreCompleto(usuariosPorId.get(id));
	const trabajo = (id) => trabajosPorId.get(id)?.titulo ?? 'Trabajo';
	const motivo = (m) => MOTIVOS[m] ?? f.capitalizar(m);

	let resumen = $derived([
		{ titulo: 'Reportes', valor: d.reportes.length, icono: 'flag', color: 'naranja', detalle: 'recibidos en total' },
		{ titulo: 'Pendientes', valor: d.reportes.filter((r) => r.estado_reporte === 'pendiente').length, icono: 'hourglass_top', color: 'ambar', detalle: 'nadie los ha tomado' },
		{ titulo: 'En revisión', valor: d.reportes.filter((r) => r.estado_reporte === 'en_revision').length, icono: 'manage_search', color: 'azul', detalle: 'un moderador los está viendo' },
		{ titulo: 'Resueltos', valor: d.reportes.filter((r) => r.estado_reporte === 'resuelto').length, icono: 'gavel', color: 'verde', detalle: 'con decisión tomada' }
	]);

	const columnas = [
		{ titulo: 'Motivo', valor: (r) => motivo(r.motivo), html: (r) => h.chip(motivo(r.motivo)) },
		{ titulo: 'Reportante', valor: (r) => nombre(r.id_reportante) },
		{ titulo: 'Reportado', valor: (r) => nombre(r.id_reportado), html: (r) => `<strong>${f.escapar(nombre(r.id_reportado))}</strong>` },
		{ titulo: 'Trabajo', valor: (r) => trabajo(r.id_trabajo), html: (r) => h.suave(trabajo(r.id_trabajo)) },
		{ titulo: 'Estado', valor: (r) => f.textoEstado(r.estado_reporte), html: (r) => h.pill(r.estado_reporte) },
		{ titulo: 'Fecha', valor: (r) => f.ordenFecha(r.created), html: (r) => h.suave(f.fecha(r.created), 'texto-3 fecha') }
	];

	function elegir(reporte) {
		seleccionado = reporte ? (d.reportes.find((r) => r.id_reporte === reporte.id_reporte) ?? reporte) : null;
		resolucion = seleccionado?.resolucion ?? '';
		error = '';
	}

	let evidencias = $derived(seleccionado ? d.adjuntos.filter((a) => a.tipo_entidad === 'reporte' && a.id_entidad === seleccionado.id_reporte) : []);

	let historial = $derived.by(() => {
		if (!seleccionado) return [];
		const r = seleccionado;
		const pasos = [{ titulo: `${nombre(r.id_reportante)} envió el reporte`, fecha: f.fechaHora(r.created), estado: 'hecho' }];
		if (r.estado_reporte === 'pendiente') pasos.push({ titulo: 'Esperando que un moderador lo tome', fecha: 'Pendiente', estado: 'actual' });
		if (r.id_admin_revisor) pasos.push({ titulo: `${nombre(r.id_admin_revisor)} lo revisó`, fecha: r.estado_reporte === 'en_revision' ? 'En revisión' : 'Revisado', estado: r.estado_reporte === 'en_revision' ? 'actual' : 'hecho' });
		if (['resuelto', 'rechazado'].includes(r.estado_reporte))
			pasos.push({ titulo: r.estado_reporte === 'resuelto' ? 'Reporte resuelto' : 'Reporte rechazado', fecha: f.fechaHora(r.fecha_resolucion ?? r.updated), estado: 'hecho' });
		return pasos;
	});

	async function cambiarEstado(estado) {
		error = '';
		if (estado !== 'en_revision' && !resolucion.trim()) {
			error = 'Explica qué se decidió y por qué.';
			return;
		}
		guardando = true;
		try {
			await api.put(`/reportes/${seleccionado.id_reporte}/resolver`, { estado_reporte: estado, resolucion: resolucion.trim() || null });
			const textos = { en_revision: 'Tomaste el reporte', resuelto: 'Reporte resuelto', rechazado: 'Reporte rechazado' };
			avisar(textos[estado]);
			await cargar();
		} catch (e) {
			error = e.message;
		} finally {
			guardando = false;
		}
	}

	async function suspender() {
		await api.del(`/usuarios/${seleccionado.id_reportado}`);
		avisar(`La cuenta de ${nombre(seleccionado.id_reportado)} quedó suspendida`);
		await cargar();
	}

	function abrirChat() {
		enfoque.set({ modulo: 'chat', id_trabajo: seleccionado.id_trabajo, usuarios: [seleccionado.id_reportante, seleccionado.id_reportado] });
		goto('/chat');
	}
</script>

<svelte:head>
	<title>Reportes | InWork</title>
</svelte:head>

<div class="pagina">
	<PageHeader titulo="Reportes" grupo="Moderación" descripcion="Las denuncias entre usuarios y cómo las resuelve el equipo de moderación.">
		{#if !puedeGestionar}
			<span class="solo-lectura"><span class="material-symbols-rounded">visibility</span>Solo lectura</span>
		{/if}
	</PageHeader>

	{#if cargando}
		<div class="vidrio"><Cargando texto="Cargando reportes" /></div>
	{:else}
		<div class="rejilla c-4">
			{#each resumen as dato (dato.titulo)}
				<StatCard {dato} />
			{/each}
		</div>

		<Tarjeta titulo="Denuncias" subtitulo="Haz clic en una para revisarla">
			<TablaDatos datos={d.reportes} {columnas} alSeleccionar={elegir} {seleccionado} clave="id_reporte" orden={[[5, 'desc']]} />
		</Tarjeta>

		{#if seleccionado}
			<Tarjeta titulo="{motivo(seleccionado.motivo)}: {trabajo(seleccionado.id_trabajo)}" subtitulo="Enviado el {f.fechaHora(seleccionado.created)}">
				<div class="reporte">
					<div class="partes">
						<div class="celda-persona">
							<Avatar nombre={nombre(seleccionado.id_reportante)} tamano="chico" />
							<div>
								<small>Reporta</small>
								<strong>{nombre(seleccionado.id_reportante)}</strong>
							</div>
						</div>
						<span class="material-symbols-rounded">arrow_forward</span>
						<div class="celda-persona">
							<Avatar nombre={nombre(seleccionado.id_reportado)} tamano="chico" />
							<div>
								<small>Reportado</small>
								<strong>{nombre(seleccionado.id_reportado)}</strong>
							</div>
						</div>
					</div>

					<div>
						<span class="subtitulo-seccion">Descripción</span>
						<p class="texto-2 descripcion">{seleccionado.descripcion}</p>
					</div>

					{#if $permiso('adjuntos')}
						<div>
							<span class="subtitulo-seccion">Evidencias</span>
							{#if evidencias.length}
								<div class="evidencias">
									{#each evidencias as evidencia (evidencia.id_adjunto)}
										<a class="imagen-falsa" href={evidencia.url} target="_blank" rel="noopener noreferrer">
											<span class="material-symbols-rounded">{evidencia.tipo_mime?.startsWith('image') ? 'screenshot' : 'description'}</span>
											Abrir evidencia
										</a>
									{/each}
								</div>
							{:else}
								<p class="texto-3 texto-chico">No adjuntó evidencias.</p>
							{/if}
						</div>
					{/if}

					<dl class="detalle">
						<div><dt>Revisor asignado</dt><dd>{seleccionado.id_admin_revisor ? nombre(seleccionado.id_admin_revisor) : 'Sin asignar'}</dd></div>
						<div><dt>Estado</dt><dd><StatusPill estado={seleccionado.estado_reporte} /></dd></div>
					</dl>

					<div>
						<span class="subtitulo-seccion">Historial</span>
						<ul class="linea-tiempo">
							{#each historial as paso, i (i)}
								<li class={paso.estado}>
									<strong>{paso.titulo}</strong>
									<small>{paso.fecha}</small>
								</li>
							{/each}
						</ul>
					</div>

					{#if puedeGestionar}
						<div class="campo">
							<label for="resolucion">Resolución</label>
							<textarea id="resolucion" class="entrada" placeholder="Explica qué se decidió y por qué" bind:value={resolucion}></textarea>
						</div>
						{#if error}
							<p class="error-campo"><span class="material-symbols-rounded">error</span>{error}</p>
						{/if}
						<div class="acciones">
							{#if seleccionado.estado_reporte === 'pendiente'}
								<button class="boton boton-claro boton-pequeno" type="button" disabled={guardando} onclick={() => cambiarEstado('en_revision')}>
									<span class="material-symbols-rounded">front_hand</span>
									Tomar reporte
								</button>
							{/if}
							<button class="boton boton-exito boton-pequeno" type="button" disabled={guardando} onclick={() => cambiarEstado('resuelto')}>
								<span class="material-symbols-rounded">gavel</span>
								Resolver
							</button>
							<button class="boton boton-claro boton-pequeno" type="button" disabled={guardando} onclick={() => cambiarEstado('rechazado')}>
								<span class="material-symbols-rounded">close</span>
								Rechazar
							</button>
						</div>
					{:else if seleccionado.resolucion}
						<div>
							<span class="subtitulo-seccion">Resolución</span>
							<p class="texto-2">{seleccionado.resolucion}</p>
						</div>
					{/if}

					<div class="acciones">
						{#if $permiso('chat')}
							<button class="boton boton-suave boton-pequeno" type="button" onclick={abrirChat}>
								<span class="material-symbols-rounded">forum</span>
								Abrir chat del trabajo
							</button>
						{/if}
						{#if $permiso('usuarios', 'eliminar') && $sesion?.id_rol === 1}
							<button class="boton boton-peligro boton-pequeno" type="button" onclick={() => (confirmarSuspender = true)}>
								<span class="material-symbols-rounded">block</span>
								Suspender a {nombre(seleccionado.id_reportado)}
							</button>
						{/if}
					</div>
				</div>
			</Tarjeta>
		{:else}
			<div class="vidrio"><EmptyState icono="flag" titulo="Sin reportes" texto="Cuando alguien denuncie a otro usuario aparecerá aquí." /></div>
		{/if}
	{/if}
</div>

<Confirmar
	bind:abierto={confirmarSuspender}
	titulo="Suspender cuenta"
	texto="{seleccionado ? nombre(seleccionado.id_reportado) : ''} no podrá volver a iniciar sesión en InWork."
	textoBoton="Suspender"
	alConfirmar={suspender}
/>

<style>
	.reporte {
		columns: 2 300px;
		column-gap: 36px;
	}
	.reporte > * {
		break-inside: avoid;
		margin-bottom: 18px;
	}
	.partes {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 14px;
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.55);
		border: 1px solid var(--linea);
	}
	.partes > .material-symbols-rounded {
		color: var(--rojo);
	}
	.partes small {
		display: block;
		font-size: 11.5px;
		color: var(--texto-3);
	}
	.descripcion {
		line-height: 1.6;
	}
	.evidencias {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}
	.evidencias .imagen-falsa {
		height: 96px;
	}
</style>
