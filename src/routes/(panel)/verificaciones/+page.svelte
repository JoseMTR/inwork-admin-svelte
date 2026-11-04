<script>
	// VERIFICACIÓN DE IDENTIDAD: el moderador compara el documento con la selfie y aprueba o rechaza.
	// El analista solo puede ver.
	import { onMount } from 'svelte';
	import { PageHeader, StatCard, Tarjeta, TablaDatos, Avatar, StatusPill, Cargando, EmptyState } from '#lib';
	import { api, cargarVarios } from '#lib/api.js';
	import { permiso } from '#lib/stores/sesion.js';
	import { avisar } from '#lib/stores/avisos.js';
	import * as f from '#lib/utils/formato.js';
	import * as h from '#lib/utils/html.js';

	let cargando = $state(true);
	let d = $state({ verificaciones: [], usuarios: [] });
	let filtro = $state('Pendientes');
	let seleccionada = $state(null);
	let observacion = $state('');
	let guardando = $state(false);
	let error = $state('');
	let fotosFallidas = $state({});

	const filtros = ['Pendientes', 'Aprobadas', 'Rechazadas', 'Todas'];
	const ESTADO_FILTRO = { Pendientes: 'pendiente', Aprobadas: 'aprobada', Rechazadas: 'rechazada' };

	let puedeRevisar = $derived($permiso('verificaciones', 'editar'));

	async function cargar() {
		const { datos } = await cargarVarios({
			verificaciones: api.get('/verificaciones-identidad/'),
			usuarios: $permiso('usuarios') ? api.get('/usuarios/') : []
		});
		d = datos;
		cargando = false;
		if (!seleccionada || !d.verificaciones.some((v) => v.id_verificacion === seleccionada.id_verificacion)) {
			elegir(lista[0] ?? d.verificaciones[0] ?? null);
		} else {
			elegir(d.verificaciones.find((v) => v.id_verificacion === seleccionada.id_verificacion));
		}
	}

	onMount(cargar);

	let usuariosPorId = $derived(f.mapaPor(d.usuarios, 'id_usuario'));
	const nombre = (id) => f.nombreCompleto(usuariosPorId.get(id));

	// Las más antiguas primero, para atenderlas en orden
	let lista = $derived(
		d.verificaciones
			.filter((v) => filtro === 'Todas' || v.estado_verificacion === ESTADO_FILTRO[filtro])
			.sort((a, b) => f.ordenFecha(a.created) - f.ordenFecha(b.created))
	);

	let resumen = $derived([
		{ titulo: 'Pendientes', valor: d.verificaciones.filter((v) => v.estado_verificacion === 'pendiente').length, icono: 'hourglass_top', color: 'ambar', detalle: 'esperando revisión' },
		{ titulo: 'Aprobadas', valor: d.verificaciones.filter((v) => v.estado_verificacion === 'aprobada').length, icono: 'verified', color: 'verde', detalle: 'identidad confirmada' },
		{ titulo: 'Rechazadas', valor: d.verificaciones.filter((v) => v.estado_verificacion === 'rechazada').length, icono: 'gpp_bad', color: 'rojo', detalle: 'deben enviar de nuevo' }
	]);

	let usuarioSel = $derived(seleccionada ? usuariosPorId.get(seleccionada.id_usuario) : null);
	let historial = $derived(
		seleccionada
			? d.verificaciones.filter((v) => v.id_usuario === seleccionada.id_usuario).sort((a, b) => f.ordenFecha(b.created) - f.ordenFecha(a.created))
			: []
	);

	function elegir(v) {
		seleccionada = v;
		observacion = v?.observacion ?? '';
		error = '';
		fotosFallidas = {};
	}

	async function revisar(estado) {
		error = '';
		if (estado === 'rechazada' && !observacion.trim()) {
			error = 'Escribe el motivo del rechazo para que la persona sepa qué corregir.';
			return;
		}
		guardando = true;
		try {
			await api.put(`/verificaciones-identidad/${seleccionada.id_verificacion}/revisar`, {
				estado_verificacion: estado,
				observacion: observacion.trim() || null
			});
			avisar(estado === 'aprobada' ? `Identidad de ${nombre(seleccionada.id_usuario)} aprobada` : 'Solicitud rechazada');
			await cargar();
		} catch (e) {
			error = e.message;
		} finally {
			guardando = false;
		}
	}

	const documentos = [
		{ campo: 'url_documento_frente', texto: 'Documento, frente', icono: 'badge' },
		{ campo: 'url_documento_reverso', texto: 'Documento, reverso', icono: 'flip' },
		{ campo: 'url_selfie', texto: 'Selfie', icono: 'face' }
	];

	const columnas = [
		{ titulo: 'Usuario', valor: (v) => nombre(v.id_usuario), html: (v) => h.persona(nombre(v.id_usuario), usuariosPorId.get(v.id_usuario)?.correo ?? '') },
		{ titulo: 'Documento', valor: (v) => usuariosPorId.get(v.id_usuario)?.numero_identificacion ?? '' },
		{ titulo: 'Estado', valor: (v) => v.estado_verificacion, html: (v) => h.pill(v.estado_verificacion) },
		{ titulo: 'Enviada', valor: (v) => f.ordenFecha(v.created), html: (v) => h.suave(f.fecha(v.created), 'texto-3 fecha') },
		{ titulo: 'Revisada por', valor: (v) => (v.id_admin_revisor ? nombre(v.id_admin_revisor) : 'Sin revisar') },
		{ titulo: 'Observación', valor: (v) => v.observacion ?? '', html: (v) => h.recortado(v.observacion ?? '—') }
	];
</script>

<svelte:head>
	<title>Verificación de identidad | InWork</title>
</svelte:head>

<div class="pagina">
	<PageHeader titulo="Verificación de identidad" grupo="Personas" descripcion="Compara el documento con la selfie y confirma que cada persona es quien dice ser.">
		{#if !puedeRevisar}
			<span class="solo-lectura"><span class="material-symbols-rounded">visibility</span>Solo lectura</span>
		{/if}
	</PageHeader>

	{#if cargando}
		<div class="vidrio"><Cargando texto="Cargando solicitudes" /></div>
	{:else}
		<div class="rejilla c-3">
			{#each resumen as dato (dato.titulo)}
				<StatCard {dato} />
			{/each}
		</div>

		<div class="rejilla revision">
			<Tarjeta titulo="Solicitudes" subtitulo="Ordenadas de la más antigua a la más reciente">
				<div class="segmentado filtros">
					{#each filtros as opcion (opcion)}
						<button type="button" class="segmento" class:activo={opcion === filtro} onclick={() => (filtro = opcion)}>{opcion}</button>
					{/each}
				</div>
				{#if lista.length === 0}
					<p class="texto-3 vacio">No hay solicitudes {filtro.toLowerCase()}.</p>
				{:else}
					<ul class="solicitudes">
						{#each lista as solicitud (solicitud.id_verificacion)}
							<li>
								<button
									type="button"
									class="solicitud"
									class:activa={solicitud.id_verificacion === seleccionada?.id_verificacion}
									onclick={() => elegir(solicitud)}
								>
									<Avatar nombre={nombre(solicitud.id_usuario)} tamano="chico" />
									<span class="solicitud-texto">
										<strong>{nombre(solicitud.id_usuario)}</strong>
										<small>{f.fechaHora(solicitud.created)}</small>
									</span>
									<StatusPill estado={solicitud.estado_verificacion} />
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</Tarjeta>

			{#if seleccionada}
				<Tarjeta titulo="Revisión" subtitulo="Enviada el {f.fechaHora(seleccionada.created)}">
					<div class="documentos">
						{#each documentos as doc (doc.campo)}
							{@const url = seleccionada[doc.campo]}
							<figure class="documento" class:selfie={doc.campo === 'url_selfie'}>
								{#if url && !fotosFallidas[doc.campo]}
									<img src={url} alt={doc.texto} onerror={() => (fotosFallidas = { ...fotosFallidas, [doc.campo]: true })} />
								{:else}
									<div class="imagen-falsa">
										<span class="material-symbols-rounded">{doc.icono}</span>
										{url ? 'No se pudo cargar la imagen' : 'No enviado'}
									</div>
								{/if}
								<figcaption>
									{doc.texto}
									{#if url}<a href={url} target="_blank" rel="noopener noreferrer">Abrir</a>{/if}
								</figcaption>
							</figure>
						{/each}
					</div>

					<div class="datos">
						<div class="celda-persona">
							<Avatar nombre={nombre(seleccionada.id_usuario)} />
							<div>
								<strong>{nombre(seleccionada.id_usuario)}</strong>
								<small>{usuarioSel?.correo ?? ''}</small>
							</div>
							<span class="espacio"></span>
							<StatusPill estado={seleccionada.estado_verificacion} />
						</div>
						<dl class="detalle">
							<div><dt>Tipo de documento</dt><dd>{f.capitalizar(usuarioSel?.tipo_identificacion ?? '—')}</dd></div>
							<div><dt>Número</dt><dd>{usuarioSel?.numero_identificacion ?? '—'}</dd></div>
							<div><dt>Ciudad</dt><dd>{usuarioSel?.ciudad ?? '—'}</dd></div>
							<div><dt>Intentos</dt><dd>{historial.length}</dd></div>
							{#if seleccionada.id_admin_revisor}
								<div><dt>Revisó</dt><dd>{nombre(seleccionada.id_admin_revisor)}</dd></div>
								<div><dt>Fecha de revisión</dt><dd>{f.fechaHora(seleccionada.fecha_revision)}</dd></div>
							{/if}
						</dl>
					</div>

					{#if puedeRevisar}
						<div class="campo">
							<label for="observacion">Observación</label>
							<textarea id="observacion" class="entrada" placeholder="Escribe el motivo si vas a rechazar la solicitud" bind:value={observacion}></textarea>
							<span class="ayuda">Es obligatoria cuando se rechaza.</span>
						</div>
						{#if error}
							<p class="error-campo"><span class="material-symbols-rounded">error</span>{error}</p>
						{/if}
						<div class="acciones decision">
							<button class="boton boton-peligro" type="button" disabled={guardando} onclick={() => revisar('rechazada')}>
								<span class="material-symbols-rounded">close</span>
								Rechazar
							</button>
							<button class="boton boton-primario" type="button" disabled={guardando} onclick={() => revisar('aprobada')}>
								<span class="material-symbols-rounded">check</span>
								{guardando ? 'Guardando...' : 'Aprobar identidad'}
							</button>
						</div>
					{:else if seleccionada.observacion}
						<div class="campo">
							<span class="etiqueta">Observación</span>
							<p class="texto-2">{seleccionada.observacion}</p>
						</div>
					{/if}

					<div class="separador"></div>

					<span class="subtitulo-seccion">Historial de este usuario</span>
					<ul class="linea-tiempo">
						{#each historial as registro (registro.id_verificacion)}
							<li class={registro.estado_verificacion === 'pendiente' ? 'actual' : 'hecho'}>
								<strong>{f.fecha(registro.created)}, {f.textoEstado(registro.estado_verificacion).toLowerCase()}</strong>
								<small>{registro.observacion ?? 'Sin observaciones'}</small>
							</li>
						{/each}
					</ul>
				</Tarjeta>
			{:else}
				<div class="vidrio">
					<EmptyState icono="badge" titulo="Sin solicitudes" texto="Cuando alguien envíe sus documentos aparecerá aquí." />
				</div>
			{/if}
		</div>

		<Tarjeta titulo="Todas las verificaciones" subtitulo="Historial completo con su revisión">
			<TablaDatos datos={d.verificaciones} {columnas} alSeleccionar={elegir} seleccionado={seleccionada} clave="id_verificacion" orden={[[3, 'desc']]} />
		</Tarjeta>
	{/if}
</div>

<style>
	.revision {
		grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.5fr);
		align-items: start;
	}
	.filtros {
		display: flex;
		width: 100%;
		margin-bottom: 14px;
	}
	.filtros .segmento {
		flex: 1;
		justify-content: center;
		padding: 0 6px;
	}
	.vacio {
		padding: 20px 4px;
	}
	.solicitudes {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
		max-height: 560px;
		overflow-y: auto;
	}
	.solicitud {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 10px;
		border-radius: 14px;
		border: 1px solid transparent;
		background: transparent;
		text-align: left;
		cursor: pointer;
	}
	.solicitud:hover {
		background: rgba(255, 255, 255, 0.5);
	}
	.solicitud.activa {
		background: rgba(255, 255, 255, 0.95);
		border-color: rgba(242, 84, 27, 0.35);
		box-shadow: 0 0 0 3px var(--naranja-suave);
	}
	.solicitud-texto {
		flex: 1;
		min-width: 0;
	}
	.solicitud-texto strong {
		display: block;
		font-size: 13.5px;
	}
	.solicitud-texto small {
		color: var(--texto-3);
		font-size: 12px;
	}
	.documentos {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
		margin-bottom: 18px;
	}
	.documento {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.documento img,
	.documento .imagen-falsa {
		width: 100%;
		height: 150px;
		object-fit: cover;
		border-radius: 14px;
		border: 1px solid var(--linea);
	}
	.selfie .imagen-falsa,
	.selfie img {
		border-color: rgba(242, 84, 27, 0.4);
	}
	figcaption {
		display: flex;
		justify-content: space-between;
		font-size: 12px;
		color: var(--texto-3);
	}
	figcaption a {
		font-weight: 700;
		color: var(--naranja);
	}
	.datos {
		display: flex;
		flex-direction: column;
		gap: 14px;
		margin-bottom: 18px;
		padding: 16px;
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.55);
		border: 1px solid var(--linea);
	}
	.espacio {
		flex: 1;
	}
	.etiqueta {
		font-size: 12.5px;
		font-weight: 600;
		color: var(--texto-2);
	}
	.decision {
		justify-content: flex-end;
		margin: 14px 0;
	}
	@media (max-width: 1100px) {
		.revision {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media (max-width: 640px) {
		.documentos {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
