<script>
	// ARCHIVOS ADJUNTOS: fotos y documentos de trabajos, mensajes y reportes (se guarda la URL).
	import { onMount } from 'svelte';
	import { PageHeader, StatCard, Tarjeta, TablaDatos, Modal, Confirmar, Cargando } from '#lib';
	import { api, cargarVarios } from '#lib/api.js';
	import { sesion, permiso } from '#lib/stores/sesion.js';
	import { avisar } from '#lib/stores/avisos.js';
	import * as f from '#lib/utils/formato.js';
	import * as h from '#lib/utils/html.js';

	const ENTIDADES = { trabajo: 'Trabajo', mensaje: 'Mensaje', reporte: 'Reporte' };
	const TIPOS_MIME = [
		{ valor: 'image/jpeg', texto: 'Imagen JPG' },
		{ valor: 'image/png', texto: 'Imagen PNG' },
		{ valor: 'application/pdf', texto: 'Documento PDF' }
	];

	let cargando = $state(true);
	let d = $state({ adjuntos: [], usuarios: [], trabajos: [], reportes: [], mensajes: [] });
	let modal = $state(false);
	let editando = $state(null);
	let form = $state({});
	let guardando = $state(false);
	let errorForm = $state('');
	let confirmar = $state(false);
	let objetivo = $state(null);

	async function cargar() {
		const { datos } = await cargarVarios({
			adjuntos: api.get('/adjuntos/'),
			usuarios: $permiso('usuarios') ? api.get('/usuarios/') : [],
			trabajos: $permiso('trabajos') ? api.get('/trabajos/') : [],
			reportes: $permiso('reportes') ? api.get('/reportes/') : [],
			mensajes: [1, 2].includes($sesion?.id_rol) ? api.get('/mensajes/') : []
		});
		d = datos;
		cargando = false;
	}

	onMount(cargar);

	let usuariosPorId = $derived(f.mapaPor(d.usuarios, 'id_usuario'));
	let trabajosPorId = $derived(f.mapaPor(d.trabajos, 'id_trabajo'));
	let reportesPorId = $derived(f.mapaPor(d.reportes, 'id_reporte'));
	let mensajesPorId = $derived(f.mapaPor(d.mensajes, 'id_mensaje'));
	const nombre = (id) => f.nombreCompleto(usuariosPorId.get(id));

	// Texto para saber a qué pertenece el archivo, sin mostrar ids
	function perteneceA(a) {
		if (a.tipo_entidad === 'trabajo') return trabajosPorId.get(a.id_entidad)?.titulo ?? 'Trabajo';
		if (a.tipo_entidad === 'reporte') {
			const r = reportesPorId.get(a.id_entidad);
			return r ? `Reporte de ${nombre(r.id_reportante)} a ${nombre(r.id_reportado)}` : 'Reporte';
		}
		const m = mensajesPorId.get(a.id_entidad);
		return m ? `Mensaje de ${nombre(m.id_remitente)}: «${m.mensaje.slice(0, 40)}»` : 'Mensaje de un chat';
	}

	const archivo = (url) => decodeURIComponent(String(url).split('/').pop().split('?')[0] || 'archivo');
	const esImagen = (a) => (a.tipo_mime ?? '').startsWith('image');

	let resumen = $derived([
		{ titulo: 'Archivos', valor: d.adjuntos.length, icono: 'attach_file', color: 'naranja', detalle: 'subidos a la plataforma' },
		{ titulo: 'Imágenes', valor: d.adjuntos.filter(esImagen).length, icono: 'image', color: 'azul', detalle: 'fotos de trabajos y pruebas' },
		{ titulo: 'Documentos', valor: d.adjuntos.filter((a) => !esImagen(a)).length, icono: 'description', color: 'morado', detalle: 'PDF y otros' }
	]);

	const columnas = [
		{
			titulo: 'Archivo',
			valor: (a) => archivo(a.url),
			html: (a) =>
				`<div class="celda-persona"><span class="icono-archivo"><span class="material-symbols-rounded">${esImagen(a) ? 'image' : 'description'}</span></span><div><strong>${f.escapar(archivo(a.url))}</strong><small>${f.escapar(a.tipo_mime ?? 'Sin tipo')}</small></div></div>`
		},
		{ titulo: 'Pertenece a', valor: (a) => perteneceA(a), html: (a) => `${h.chip(ENTIDADES[a.tipo_entidad])}<small class="bajo">${f.escapar(perteneceA(a))}</small>` },
		{ titulo: 'Subido por', valor: (a) => nombre(a.id_subido_por) },
		{ titulo: 'Fecha', valor: (a) => f.ordenFecha(a.created), html: (a) => h.suave(f.fecha(a.created), 'texto-3 fecha') }
	];

	let acciones = $derived([
		{ texto: 'Abrir', icono: 'open_in_new', soloIcono: true, alHacer: (a) => window.open(a.url, '_blank', 'noopener') },
		...($permiso('adjuntos', 'editar') ? [{ texto: 'Editar', icono: 'edit', soloIcono: true, alHacer: abrirEditar }] : []),
		...($permiso('adjuntos', 'eliminar') ? [{ texto: 'Eliminar', icono: 'delete', tono: 'peligro', soloIcono: true, alHacer: (a) => ((objetivo = a), (confirmar = true)) }] : [])
	]);

	// Opciones del formulario: se elige por nombre, nunca escribiendo ids
	let opcionesEntidad = $derived({
		trabajo: d.trabajos.map((t) => ({ valor: t.id_trabajo, texto: t.titulo })),
		reporte: d.reportes.map((r) => ({ valor: r.id_reporte, texto: `Reporte de ${nombre(r.id_reportante)} a ${nombre(r.id_reportado)}` })),
		mensaje: d.mensajes.map((m) => ({ valor: m.id_mensaje, texto: `${nombre(m.id_remitente)}: ${m.mensaje.slice(0, 50)}` }))
	});

	function abrirNuevo() {
		editando = null;
		form = { tipo_entidad: 'trabajo', id_entidad: opcionesEntidad.trabajo[0]?.valor ?? null, url: '', tipo_mime: 'image/jpeg' };
		errorForm = '';
		modal = true;
	}

	function abrirEditar(a) {
		editando = a;
		form = { tipo_entidad: a.tipo_entidad, id_entidad: a.id_entidad, url: a.url, tipo_mime: a.tipo_mime ?? 'image/jpeg' };
		errorForm = '';
		modal = true;
	}

	function cambiarEntidad() {
		form.id_entidad = opcionesEntidad[form.tipo_entidad][0]?.valor ?? null;
	}

	async function guardar(evento) {
		evento.preventDefault();
		if (!/^https?:\/\/\S+$/.test(form.url.trim())) {
			errorForm = 'Escribe la dirección completa del archivo (empieza por https://).';
			return;
		}
		if (!form.id_entidad) {
			errorForm = 'Elige a qué pertenece el archivo.';
			return;
		}
		guardando = true;
		errorForm = '';
		try {
			const cuerpo = { tipo_entidad: form.tipo_entidad, id_entidad: Number(form.id_entidad), url: form.url.trim(), tipo_mime: form.tipo_mime };
			if (editando) await api.put(`/adjuntos/${editando.id_adjunto}`, cuerpo);
			else await api.post('/adjuntos/', cuerpo);
			avisar(editando ? 'Archivo actualizado' : 'Archivo registrado');
			modal = false;
			await cargar();
		} catch (e) {
			errorForm = e.message;
		} finally {
			guardando = false;
		}
	}

	async function eliminar() {
		await api.del(`/adjuntos/${objetivo.id_adjunto}`);
		avisar('Archivo eliminado');
		await cargar();
	}
</script>

<svelte:head>
	<title>Archivos adjuntos | InWork</title>
</svelte:head>

<div class="pagina">
	<PageHeader titulo="Archivos adjuntos" grupo="Moderación" descripcion="Fotos de los trabajos, pruebas de los reportes y archivos enviados por chat.">
		{#if $permiso('adjuntos', 'crear')}
			<button class="boton boton-primario" type="button" onclick={abrirNuevo}>
				<span class="material-symbols-rounded">upload_file</span>
				Registrar archivo
			</button>
		{/if}
	</PageHeader>

	{#if cargando}
		<div class="vidrio"><Cargando texto="Cargando archivos" /></div>
	{:else}
		<div class="rejilla c-3">
			{#each resumen as dato (dato.titulo)}
				<StatCard {dato} />
			{/each}
		</div>

		<Tarjeta titulo="Archivos" subtitulo="Usa el botón abrir para ver cada archivo">
			<TablaDatos datos={d.adjuntos} {columnas} {acciones} orden={[[3, 'desc']]} vacio="No hay archivos adjuntos" />
		</Tarjeta>
	{/if}
</div>

<Modal bind:abierto={modal} titulo={editando ? 'Editar archivo' : 'Registrar archivo'} subtitulo="El archivo debe estar subido en internet (por ejemplo Cloudinary o Google Drive)" ancho="560px">
	<form id="form-adjunto" class="campos" onsubmit={guardar} novalidate>
		<div class="rejilla c-2">
			<div class="campo">
				<label for="a-entidad">Pertenece a</label>
				<select id="a-entidad" class="entrada" bind:value={form.tipo_entidad} onchange={cambiarEntidad}>
					{#each Object.entries(ENTIDADES) as [valor, texto] (valor)}<option value={valor}>{texto}</option>{/each}
				</select>
			</div>
			<div class="campo">
				<label for="a-mime">Tipo de archivo</label>
				<select id="a-mime" class="entrada" bind:value={form.tipo_mime}>
					{#each TIPOS_MIME as tipo (tipo.valor)}<option value={tipo.valor}>{tipo.texto}</option>{/each}
				</select>
			</div>
		</div>
		<div class="campo">
			<label for="a-registro">{ENTIDADES[form.tipo_entidad] ?? 'Registro'}</label>
			<select id="a-registro" class="entrada" bind:value={form.id_entidad}>
				{#each opcionesEntidad[form.tipo_entidad] ?? [] as opcion (opcion.valor)}<option value={opcion.valor}>{opcion.texto}</option>{/each}
			</select>
		</div>
		<div class="campo">
			<label for="a-url">Dirección del archivo</label>
			<input id="a-url" class="entrada" bind:value={form.url} placeholder="https://res.cloudinary.com/inwork/foto.jpg" />
		</div>
		{#if errorForm}
			<p class="error-campo"><span class="material-symbols-rounded">error</span>{errorForm}</p>
		{/if}
	</form>
	{#snippet pie()}
		<button class="boton boton-claro" type="button" onclick={() => (modal = false)}>Cancelar</button>
		<button class="boton boton-primario" type="submit" form="form-adjunto" disabled={guardando}>
			<span class="material-symbols-rounded">save</span>
			{guardando ? 'Guardando...' : 'Guardar'}
		</button>
	{/snippet}
</Modal>

<Confirmar bind:abierto={confirmar} titulo="Eliminar archivo" texto="Se quitará «{objetivo ? archivo(objetivo.url) : ''}» de la plataforma." textoBoton="Eliminar" alConfirmar={eliminar} />

<style>
	.campos {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.campos .rejilla {
		gap: 14px;
	}
	:global(.icono-archivo) {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 12px;
		color: var(--azul);
		background: var(--azul-suave);
		flex-shrink: 0;
	}
</style>
