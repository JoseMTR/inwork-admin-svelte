<script>
	// SEGURIDAD: códigos para verificar correos y recuperar contraseñas (tabla tokens_usuario).
	// El valor del código nunca se muestra; solo para quién es, para qué sirve y si sigue vigente.
	import { onMount } from 'svelte';
	import { PageHeader, StatCard, Tarjeta, TablaDatos, Modal, Confirmar, Cargando } from '#lib';
	import { api, cargarVarios } from '#lib/api.js';
	import { permiso } from '#lib/stores/sesion.js';
	import { avisar } from '#lib/stores/avisos.js';
	import * as f from '#lib/utils/formato.js';
	import * as h from '#lib/utils/html.js';

	const TIPOS = { verificacion_correo: 'Verificar correo', recuperar_password: 'Recuperar contraseña', refresh: 'Mantener sesión' };

	let cargando = $state(true);
	let d = $state({ tokens: [], usuarios: [] });
	let modal = $state(false);
	let form = $state({});
	let errorForm = $state('');
	let guardando = $state(false);
	let confirmar = $state(false);
	let objetivo = $state(null);

	async function cargar() {
		const { datos } = await cargarVarios({
			tokens: api.get('/tokens-usuario/'),
			usuarios: $permiso('usuarios') ? api.get('/usuarios/') : []
		});
		d = datos;
		cargando = false;
	}

	onMount(cargar);

	let usuariosPorId = $derived(f.mapaPor(d.usuarios, 'id_usuario'));
	const nombre = (id) => f.nombreCompleto(usuariosPorId.get(id));
	const estado = (t) => (t.usado ? 'usado' : f.ordenFecha(t.expira) < Date.now() ? 'vencido' : 'vigente');

	let resumen = $derived([
		{ titulo: 'Vigentes', valor: d.tokens.filter((t) => estado(t) === 'vigente').length, icono: 'key', color: 'ambar', detalle: 'se pueden usar todavía' },
		{ titulo: 'Usados', valor: d.tokens.filter((t) => estado(t) === 'usado').length, icono: 'task_alt', color: 'verde', detalle: 'ya cumplieron su función' },
		{ titulo: 'Vencidos', valor: d.tokens.filter((t) => estado(t) === 'vencido').length, icono: 'timer_off', color: 'rojo', detalle: 'pasó su fecha límite' }
	]);

	const columnas = [
		{ titulo: 'Usuario', valor: (t) => nombre(t.id_usuario), html: (t) => h.persona(nombre(t.id_usuario), usuariosPorId.get(t.id_usuario)?.correo ?? '') },
		{ titulo: 'Para qué sirve', valor: (t) => TIPOS[t.tipo] ?? t.tipo, html: (t) => h.chip(TIPOS[t.tipo] ?? t.tipo, 'key') },
		{ titulo: 'Estado', valor: (t) => estado(t), html: (t) => h.pill(estado(t)) },
		{ titulo: 'Vence', valor: (t) => f.ordenFecha(t.expira), html: (t) => h.suave(f.fechaHora(t.expira), 'texto-2 fecha') },
		{ titulo: 'Creado', valor: (t) => f.ordenFecha(t.created), html: (t) => h.suave(f.fechaHora(t.created), 'texto-3 fecha') }
	];

	let acciones = $derived(
		$permiso('seguridad', 'eliminar')
			? [{ texto: 'Revocar', icono: 'block', tono: 'peligro', soloIcono: true, mostrar: (t) => estado(t) === 'vigente', alHacer: (t) => ((objetivo = t), (confirmar = true)) }]
			: []
	);

	function abrirNuevo() {
		form = { id_usuario: d.usuarios[0]?.id_usuario ?? null, tipo: 'recuperar_password', horas: 24 };
		errorForm = '';
		modal = true;
	}

	async function guardar(evento) {
		evento.preventDefault();
		guardando = true;
		errorForm = '';
		try {
			const expira = new Date(Date.now() + Number(form.horas) * 3600000);
			const local = new Date(expira.getTime() - expira.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
			await api.post('/tokens-usuario/', {
				id_usuario: Number(form.id_usuario),
				tipo: form.tipo,
				token: crypto.randomUUID().replaceAll('-', ''),
				expira: local,
				usado: false
			});
			avisar(`Código de «${TIPOS[form.tipo]}» generado para ${nombre(Number(form.id_usuario))}`);
			modal = false;
			await cargar();
		} catch (e) {
			errorForm = e.message;
		} finally {
			guardando = false;
		}
	}

	async function revocar() {
		await api.del(`/tokens-usuario/${objetivo.id_token}`);
		avisar('Código revocado: ya no se puede usar');
		await cargar();
	}
</script>

<svelte:head>
	<title>Seguridad | InWork</title>
</svelte:head>

<div class="pagina">
	<PageHeader titulo="Seguridad" grupo="Sistema" descripcion="Códigos de un solo uso para verificar correos y recuperar contraseñas.">
		{#if $permiso('seguridad', 'crear')}
			<button class="boton boton-primario" type="button" onclick={abrirNuevo}>
				<span class="material-symbols-rounded">key</span>
				Generar código
			</button>
		{/if}
	</PageHeader>

	{#if cargando}
		<div class="vidrio"><Cargando texto="Cargando códigos" /></div>
	{:else}
		<div class="rejilla c-3">
			{#each resumen as dato (dato.titulo)}
				<StatCard {dato} />
			{/each}
		</div>

		<Tarjeta titulo="Códigos de seguridad" subtitulo="Por seguridad el valor del código nunca se muestra en el panel">
			<TablaDatos datos={d.tokens} {columnas} {acciones} orden={[[4, 'desc']]} vacio="No hay códigos registrados" />
		</Tarjeta>
	{/if}
</div>

<Modal bind:abierto={modal} titulo="Generar código" subtitulo="Se crea un código aleatorio de un solo uso" ancho="480px">
	<form id="form-token" class="campos" onsubmit={guardar} novalidate>
		<div class="campo">
			<label for="t-usuario">Usuario</label>
			<select id="t-usuario" class="entrada" bind:value={form.id_usuario}>
				{#each d.usuarios as usuario (usuario.id_usuario)}<option value={usuario.id_usuario}>{f.nombreCompleto(usuario)}</option>{/each}
			</select>
		</div>
		<div class="campo">
			<label for="t-tipo">Para qué sirve</label>
			<select id="t-tipo" class="entrada" bind:value={form.tipo}>
				<option value="recuperar_password">Recuperar contraseña</option>
				<option value="verificacion_correo">Verificar correo</option>
			</select>
		</div>
		<div class="campo">
			<label for="t-horas">Vence en</label>
			<select id="t-horas" class="entrada" bind:value={form.horas}>
				<option value={1}>1 hora</option>
				<option value={24}>24 horas</option>
				<option value={72}>3 días</option>
			</select>
		</div>
		{#if errorForm}
			<p class="error-campo"><span class="material-symbols-rounded">error</span>{errorForm}</p>
		{/if}
	</form>
	{#snippet pie()}
		<button class="boton boton-claro" type="button" onclick={() => (modal = false)}>Cancelar</button>
		<button class="boton boton-primario" type="submit" form="form-token" disabled={guardando}>{guardando ? 'Generando...' : 'Generar'}</button>
	{/snippet}
</Modal>

<Confirmar bind:abierto={confirmar} titulo="Revocar código" texto="El código de {objetivo ? nombre(objetivo.id_usuario) : ''} dejará de funcionar." textoBoton="Revocar" alConfirmar={revocar} />

<style>
	.campos {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
</style>
