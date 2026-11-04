<script>
	// NOTIFICACIONES: avisos que reciben los usuarios. El equipo puede enviar avisos nuevos.
	// La API también las crea sola (oferta aceptada, contrato finalizado, etc.).
	import { onMount } from 'svelte';
	import { PageHeader, StatCard, Tarjeta, TablaDatos, Modal, Confirmar, Cargando } from '#lib';
	import { api, cargarVarios } from '#lib/api.js';
	import { sesion, permiso } from '#lib/stores/sesion.js';
	import { avisar } from '#lib/stores/avisos.js';
	import * as f from '#lib/utils/formato.js';
	import * as h from '#lib/utils/html.js';

	const TIPOS = {
		sistema: 'Aviso del sistema',
		verificacion: 'Verificación',
		reporte: 'Reporte',
		oferta_aceptada: 'Oferta aceptada',
		contratacion_finalizada: 'Contrato finalizado',
		contratacion_cancelada: 'Contrato cancelado'
	};
	const DESTINOS = [
		{ valor: 'uno', texto: 'Una persona' },
		{ valor: 'empleados', texto: 'Todos los empleados' },
		{ valor: 'empleadores', texto: 'Todos los empleadores' }
	];

	let cargando = $state(true);
	let d = $state({ notificaciones: [], usuarios: [] });
	let modal = $state(false);
	let editando = $state(null);
	let form = $state({});
	let guardando = $state(false);
	let errorForm = $state('');
	let confirmar = $state(false);
	let objetivo = $state(null);

	let esEquipo = $derived([1, 2].includes($sesion?.id_rol));
	let puedeCrear = $derived($permiso('notificaciones', 'crear') && esEquipo);

	async function cargar() {
		const { datos } = await cargarVarios({
			notificaciones: api.get('/notificaciones/'),
			usuarios: $permiso('usuarios') ? api.get('/usuarios/') : []
		});
		d = datos;
		cargando = false;
	}

	onMount(cargar);

	let usuariosPorId = $derived(f.mapaPor(d.usuarios, 'id_usuario'));
	const nombre = (id) => (id === $sesion?.id_usuario ? `${$sesion.nombre} (tú)` : f.nombreCompleto(usuariosPorId.get(id)));

	let resumen = $derived([
		{ titulo: 'Notificaciones', valor: d.notificaciones.length, icono: 'notifications', color: 'naranja', detalle: esEquipo ? 'de todos los usuarios' : 'tuyas' },
		{ titulo: 'Sin leer', valor: d.notificaciones.filter((n) => !n.leida).length, icono: 'mark_email_unread', color: 'ambar', detalle: 'todavía no se abren' },
		{ titulo: 'Para ti', valor: d.notificaciones.filter((n) => n.id_usuario === $sesion?.id_usuario).length, icono: 'person', color: 'azul', detalle: 'que te llegaron a ti' }
	]);

	const columnas = [
		{ titulo: 'Para', valor: (n) => nombre(n.id_usuario), html: (n) => h.persona(nombre(n.id_usuario)) },
		{ titulo: 'Tipo', valor: (n) => TIPOS[n.tipo] ?? n.tipo, html: (n) => h.chip(TIPOS[n.tipo] ?? f.capitalizar(n.tipo)) },
		{ titulo: 'Título', valor: (n) => n.titulo, html: (n) => h.titulo(n.titulo) },
		{ titulo: 'Contenido', valor: (n) => n.contenido ?? '', html: (n) => h.recortado(n.contenido ?? '—') },
		{ titulo: 'Estado', valor: (n) => (n.leida ? 'Leída' : 'Sin leer'), html: (n) => h.pill(n.leida ? 'leida' : 'sin_leer') },
		{ titulo: 'Fecha', valor: (n) => f.ordenFecha(n.created), html: (n) => h.suave(f.fechaHora(n.created), 'texto-3 fecha') }
	];

	let acciones = $derived([
		...($permiso('notificaciones', 'editar')
			? [{ texto: 'Marcar como leída', icono: 'done_all', soloIcono: true, mostrar: (n) => !n.leida && n.id_usuario === $sesion?.id_usuario, alHacer: marcarLeida }]
			: []),
		...(esEquipo && $permiso('notificaciones', 'editar') ? [{ texto: 'Editar', icono: 'edit', soloIcono: true, alHacer: abrirEditar }] : []),
		...($permiso('notificaciones', 'eliminar')
			? [{ texto: 'Eliminar', icono: 'delete', tono: 'peligro', soloIcono: true, mostrar: (n) => esEquipo || n.id_usuario === $sesion?.id_usuario, alHacer: (n) => ((objetivo = n), (confirmar = true)) }]
			: [])
	]);

	let personas = $derived(d.usuarios.filter((u) => u.id_rol >= 4).sort((a, b) => f.nombreCompleto(a).localeCompare(f.nombreCompleto(b))));

	function abrirNuevo() {
		editando = null;
		form = { destino: 'uno', id_usuario: personas[0]?.id_usuario ?? null, tipo: 'sistema', titulo: '', contenido: '' };
		errorForm = '';
		modal = true;
	}

	function abrirEditar(n) {
		editando = n;
		form = { destino: 'uno', id_usuario: n.id_usuario, tipo: n.tipo, titulo: n.titulo, contenido: n.contenido ?? '' };
		errorForm = '';
		modal = true;
	}

	async function guardar(evento) {
		evento.preventDefault();
		if (!form.titulo.trim()) {
			errorForm = 'Escribe un título.';
			return;
		}
		guardando = true;
		errorForm = '';
		try {
			const cuerpo = (id_usuario) => ({ id_usuario, tipo: form.tipo, titulo: form.titulo.trim(), contenido: form.contenido.trim() || null, id_referencia: editando?.id_referencia ?? null });
			if (editando) {
				await api.put(`/notificaciones/${editando.id_notificacion}`, cuerpo(Number(form.id_usuario)));
				avisar('Notificación actualizada');
			} else {
				const destinatarios =
					form.destino === 'uno' ? [Number(form.id_usuario)] : d.usuarios.filter((u) => u.id_rol === (form.destino === 'empleados' ? 5 : 4)).map((u) => u.id_usuario);
				for (const id of destinatarios) await api.post('/notificaciones/', cuerpo(id));
				avisar(destinatarios.length === 1 ? 'Notificación enviada' : `Notificación enviada a ${destinatarios.length} personas`);
			}
			modal = false;
			await cargar();
		} catch (e) {
			errorForm = e.message;
		} finally {
			guardando = false;
		}
	}

	async function marcarLeida(n) {
		try {
			await api.put(`/notificaciones/${n.id_notificacion}/leer`);
			avisar('Marcada como leída');
			await cargar();
		} catch (e) {
			avisar(e.message, 'error');
		}
	}

	async function eliminar() {
		await api.del(`/notificaciones/${objetivo.id_notificacion}`);
		avisar('Notificación eliminada');
		await cargar();
	}
</script>

<svelte:head>
	<title>Notificaciones | InWork</title>
</svelte:head>

<div class="pagina">
	<PageHeader titulo="Notificaciones" grupo="Moderación" descripcion="Los avisos que reciben los usuarios en la aplicación.">
		{#if puedeCrear}
			<button class="boton boton-primario" type="button" onclick={abrirNuevo}>
				<span class="material-symbols-rounded">send</span>
				Enviar notificación
			</button>
		{:else}
			<span class="solo-lectura"><span class="material-symbols-rounded">visibility</span>Solo tus notificaciones</span>
		{/if}
	</PageHeader>

	{#if cargando}
		<div class="vidrio"><Cargando texto="Cargando notificaciones" /></div>
	{:else}
		<div class="rejilla c-3">
			{#each resumen as dato (dato.titulo)}
				<StatCard {dato} />
			{/each}
		</div>

		<Tarjeta titulo="Notificaciones" subtitulo="Las más recientes primero">
			<TablaDatos datos={d.notificaciones} {columnas} {acciones} orden={[[5, 'desc']]} vacio="No hay notificaciones" />
		</Tarjeta>
	{/if}
</div>

<Modal bind:abierto={modal} titulo={editando ? 'Editar notificación' : 'Enviar notificación'} ancho="560px">
	<form id="form-notificacion" class="campos" onsubmit={guardar} novalidate>
		{#if !editando}
			<div class="campo">
				<label for="n-destino">Enviar a</label>
				<select id="n-destino" class="entrada" bind:value={form.destino}>
					{#each DESTINOS as destino (destino.valor)}<option value={destino.valor}>{destino.texto}</option>{/each}
				</select>
			</div>
		{/if}
		{#if form.destino === 'uno'}
			<div class="campo">
				<label for="n-usuario">Persona</label>
				<select id="n-usuario" class="entrada" bind:value={form.id_usuario}>
					{#each personas as persona (persona.id_usuario)}
						<option value={persona.id_usuario}>{f.nombreCompleto(persona)} ({persona.rol})</option>
					{/each}
				</select>
			</div>
		{/if}
		<div class="campo">
			<label for="n-tipo">Tipo</label>
			<select id="n-tipo" class="entrada" bind:value={form.tipo}>
				{#each Object.entries(TIPOS) as [valor, texto] (valor)}<option value={valor}>{texto}</option>{/each}
			</select>
		</div>
		<div class="campo">
			<label for="n-titulo">Título</label>
			<input id="n-titulo" class="entrada" bind:value={form.titulo} placeholder="Ej: Actualizamos los términos de uso" />
		</div>
		<div class="campo">
			<label for="n-contenido">Mensaje</label>
			<textarea id="n-contenido" class="entrada" bind:value={form.contenido} placeholder="Lo que verá la persona en la app"></textarea>
		</div>
		{#if errorForm}
			<p class="error-campo"><span class="material-symbols-rounded">error</span>{errorForm}</p>
		{/if}
	</form>
	{#snippet pie()}
		<button class="boton boton-claro" type="button" onclick={() => (modal = false)}>Cancelar</button>
		<button class="boton boton-primario" type="submit" form="form-notificacion" disabled={guardando}>
			<span class="material-symbols-rounded">send</span>
			{guardando ? 'Enviando...' : editando ? 'Guardar' : 'Enviar'}
		</button>
	{/snippet}
</Modal>

<Confirmar bind:abierto={confirmar} titulo="Eliminar notificación" texto="«{objetivo?.titulo ?? ''}» dejará de aparecer en la app." textoBoton="Eliminar" alConfirmar={eliminar} />

<style>
	.campos {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
</style>
