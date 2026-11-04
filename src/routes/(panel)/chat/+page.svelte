<script>
	// CHATS Y MENSAJES: conversaciones entre clientes y trabajadores (solo lectura en el panel).
	import { onMount } from 'svelte';
	import { PageHeader, Avatar, ChatBubble, Cargando, EmptyState } from '#lib';
	import { api, cargarVarios } from '#lib/api.js';
	import { permiso } from '#lib/stores/sesion.js';
	import { enfoque, tomarEnfoque } from '#lib/stores/enfoque.js';
	import { goto } from '$app/navigation';
	import * as f from '#lib/utils/formato.js';

	let cargando = $state(true);
	let d = $state({ chats: [], mensajes: [], usuarios: [], trabajos: [], reportes: [] });
	let seleccionado = $state(null);
	let mensajes = $state([]);
	let cargandoMensajes = $state(false);
	let busqueda = $state('');

	async function cargar() {
		const { datos } = await cargarVarios({
			chats: api.get('/chats/'),
			mensajes: api.get('/mensajes/'),
			usuarios: $permiso('usuarios') ? api.get('/usuarios/') : [],
			trabajos: $permiso('trabajos') ? api.get('/trabajos/') : [],
			reportes: $permiso('reportes') ? api.get('/reportes/') : []
		});
		d = datos;
		cargando = false;
		const pedido = tomarEnfoque('chat');
		let elegido = null;
		if (pedido) {
			elegido =
				d.chats.find((c) => c.id_trabajo === pedido.id_trabajo && (!pedido.usuarios || pedido.usuarios.includes(c.id_trabajador))) ??
				d.chats.find((c) => c.id_trabajo === pedido.id_trabajo);
		}
		elegir(elegido ?? chats[0] ?? null);
	}

	onMount(cargar);

	let usuariosPorId = $derived(f.mapaPor(d.usuarios, 'id_usuario'));
	let trabajosPorId = $derived(f.mapaPor(d.trabajos, 'id_trabajo'));
	const nombre = (id) => f.nombreCompleto(usuariosPorId.get(id));
	const trabajo = (id) => trabajosPorId.get(id)?.titulo ?? 'Trabajo';

	function ultimoMensaje(chat) {
		const lista = d.mensajes.filter((m) => m.id_chat === chat.id_chat);
		return lista.sort((a, b) => f.ordenFecha(b.created) - f.ordenFecha(a.created))[0];
	}

	function reporteDe(chat) {
		return d.reportes.find(
			(r) => r.id_trabajo === chat.id_trabajo && [chat.id_cliente, chat.id_trabajador].includes(r.id_reportante) && [chat.id_cliente, chat.id_trabajador].includes(r.id_reportado)
		);
	}

	let chats = $derived(
		d.chats
			.map((c) => ({ ...c, ultimo: ultimoMensaje(c), reporte: reporteDe(c) }))
			.filter((c) => {
				const texto = `${trabajo(c.id_trabajo)} ${nombre(c.id_cliente)} ${nombre(c.id_trabajador)}`.toLowerCase();
				return texto.includes(busqueda.trim().toLowerCase());
			})
			.sort((a, b) => f.ordenFecha(b.ultimo?.created) - f.ordenFecha(a.ultimo?.created))
	);

	async function elegir(chat) {
		seleccionado = chat ? { ...chat, reporte: reporteDe(chat) } : null;
		mensajes = [];
		if (!chat) return;
		cargandoMensajes = true;
		try {
			mensajes = await api.get(`/mensajes/chat/${chat.id_chat}`);
		} catch {
			mensajes = d.mensajes.filter((m) => m.id_chat === chat.id_chat);
		} finally {
			cargandoMensajes = false;
		}
	}

	function verReporte() {
		enfoque.set({ modulo: 'reportes', id_reporte: seleccionado.reporte.id_reporte });
		goto('/reportes');
	}

	function verTrabajo() {
		enfoque.set({ modulo: 'trabajos', id_trabajo: seleccionado.id_trabajo });
		goto('/trabajos');
	}
</script>

<svelte:head>
	<title>Chats y mensajes | InWork</title>
</svelte:head>

<div class="pagina">
	<PageHeader titulo="Chats y mensajes" grupo="Moderación" descripcion="Conversaciones entre clientes y trabajadores. Úsalas cuando haya un reporte o una disputa." />

	{#if cargando}
		<div class="vidrio"><Cargando texto="Cargando conversaciones" /></div>
	{:else}
		<div class="espacio">
			<aside class="lista-chats vidrio">
				<label class="buscar">
					<span class="material-symbols-rounded">search</span>
					<input type="search" placeholder="Buscar por usuario o trabajo" bind:value={busqueda} />
				</label>
				<span class="texto-3 texto-chico">{chats.length} conversaciones</span>
				<ul class="chats">
					{#each chats as chat (chat.id_chat)}
						<li>
							<button type="button" class="chat" class:activo={chat.id_chat === seleccionado?.id_chat} onclick={() => elegir(chat)}>
								<Avatar nombre={nombre(chat.id_trabajador)} />
								<span class="chat-texto">
									<span class="chat-fila">
										<strong>{trabajo(chat.id_trabajo)}</strong>
										<span class="hora">{chat.ultimo ? f.haceCuanto(chat.ultimo.created) : ''}</span>
									</span>
									<small>{nombre(chat.id_cliente)} y {nombre(chat.id_trabajador)}</small>
									<span class="ultimo">{chat.ultimo?.mensaje ?? 'Sin mensajes'}</span>
									{#if chat.reporte}
										<span class="etiqueta-reporte">
											<span class="material-symbols-rounded">flag</span>
											Con reporte
										</span>
									{/if}
								</span>
							</button>
						</li>
					{/each}
				</ul>
			</aside>

			{#if seleccionado}
				<section class="conversacion vidrio">
					<header class="conversacion-cabecera">
						<div>
							<h2>{trabajo(seleccionado.id_trabajo)}</h2>
							<span class="texto-2">{nombre(seleccionado.id_cliente)} (cliente) y {nombre(seleccionado.id_trabajador)} (trabajador)</span>
						</div>
						<div class="acciones">
							{#if seleccionado.reporte && $permiso('reportes')}
								<button class="boton boton-peligro boton-pequeno" type="button" onclick={verReporte}>
									<span class="material-symbols-rounded">flag</span>
									Ver reporte
								</button>
							{/if}
							{#if $permiso('trabajos')}
								<button class="boton boton-claro boton-pequeno" type="button" onclick={verTrabajo}>
									<span class="material-symbols-rounded">work</span>
									Ver trabajo
								</button>
							{/if}
						</div>
					</header>

					<div class="aviso">
						<span class="material-symbols-rounded">visibility</span>
						Modo solo lectura. El equipo de InWork puede leer este chat, pero no escribir en él.
					</div>

					<div class="mensajes">
						{#if cargandoMensajes}
							<p class="texto-3">Cargando mensajes...</p>
						{:else if mensajes.length === 0}
							<p class="texto-3">Esta conversación no tiene mensajes.</p>
						{:else}
							{#each mensajes as mensaje (mensaje.id_mensaje)}
								<ChatBubble
									autor={nombre(mensaje.id_remitente)}
									hora={f.fechaHora(mensaje.created)}
									propio={mensaje.id_remitente === seleccionado.id_trabajador}
								>
									{mensaje.mensaje}
								</ChatBubble>
							{/each}
						{/if}
					</div>

					<footer class="pie">
						<span class="material-symbols-rounded">lock</span>
						No se pueden enviar mensajes desde el panel.
					</footer>
				</section>
			{:else}
				<div class="vidrio"><EmptyState icono="forum" titulo="Sin conversaciones" texto="Cuando un cliente y un trabajador hablen aparecerá aquí." /></div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.espacio {
		display: grid;
		grid-template-columns: 360px minmax(0, 1fr);
		gap: 20px;
		align-items: start;
	}
	.lista-chats {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 14px;
	}
	.buscar {
		display: flex;
		align-items: center;
		gap: 8px;
		height: 42px;
		padding: 0 12px;
		border-radius: 13px;
		background: rgba(255, 255, 255, 0.7);
		border: 1px solid var(--linea);
		color: var(--texto-3);
	}
	.buscar input {
		flex: 1;
		min-width: 0;
		border: 0;
		outline: none;
		background: transparent;
	}
	.chats {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
		max-height: 640px;
		overflow-y: auto;
	}
	.chat {
		display: flex;
		gap: 12px;
		width: 100%;
		padding: 12px;
		border-radius: 14px;
		border: 1px solid transparent;
		background: transparent;
		text-align: left;
		cursor: pointer;
	}
	.chat:hover {
		background: rgba(255, 255, 255, 0.5);
	}
	.chat.activo {
		background: rgba(255, 255, 255, 0.95);
		border-color: rgba(242, 84, 27, 0.3);
		box-shadow: 0 8px 20px -14px rgba(23, 31, 46, 0.5);
	}
	.chat-texto {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.chat-fila {
		display: flex;
		justify-content: space-between;
		gap: 8px;
	}
	.chat-fila strong {
		font-size: 13.5px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.hora {
		font-size: 11.5px;
		color: var(--texto-3);
		white-space: nowrap;
	}
	.chat-texto small {
		font-size: 12px;
		color: var(--texto-3);
	}
	.ultimo {
		font-size: 12.5px;
		color: var(--texto-2);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.etiqueta-reporte {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		margin-top: 4px;
		padding: 2px 8px;
		border-radius: 999px;
		font-size: 11.5px;
		font-weight: 700;
		color: var(--rojo);
		background: var(--rojo-suave);
	}
	.etiqueta-reporte .material-symbols-rounded {
		font-size: 14px;
	}
	.conversacion {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 20px;
	}
	.conversacion-cabecera {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
		padding-bottom: 14px;
		border-bottom: 1px solid var(--linea);
	}
	.conversacion-cabecera h2 {
		font-size: 18px;
		font-weight: 800;
	}
	.aviso {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		border-radius: 12px;
		font-size: 12.5px;
		font-weight: 600;
		color: var(--azul);
		background: var(--azul-suave);
	}
	.aviso .material-symbols-rounded {
		font-size: 18px;
	}
	.mensajes {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 6px 0;
		max-height: 560px;
		overflow-y: auto;
	}
	.pie {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 12px;
		border-radius: 14px;
		border: 1px dashed var(--linea-fuerte);
		font-size: 12.5px;
		color: var(--texto-3);
	}
	.pie .material-symbols-rounded {
		font-size: 17px;
	}
	@media (max-width: 1100px) {
		.espacio {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
