<script>
	// Marco del panel: menú lateral + barra superior + contenido + pie.
	// Revisa que haya sesión y que el rol tenga permiso (tabla rol_modulo) para la página que se abre.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Sidebar, Topbar, Footer, SinPermiso, Cargando } from '#lib';
	import { api } from '#lib/api.js';
	import { sesion, modulos, permiso, cerrarSesion, tokenVencido, ROLES_PANEL } from '#lib/stores/sesion.js';
	import { construirMenu } from '#lib/utils/menu.js';

	let { children } = $props();

	let listo = $state(false);
	let menuAbierto = $state(false);
	let insignias = $state({});
	let noLeidas = $state(0);

	let grupos = $derived(construirMenu($modulos));

	// Inicio y Perfil son de todos; lo demás debe estar en la tabla rol_modulo con permiso de leer
	let permitido = $derived.by(() => {
		const ruta = page.url.pathname;
		if (ruta === '/inicio' || ruta === '/perfil') return true;
		if ($sesion?.id_rol === 1) return true;
		const modulo = ($modulos || []).find((m) => ruta === m.ruta || ruta.startsWith(m.ruta + '/'));
		return !!modulo && modulo.puede_leer;
	});

	async function cargarContadores() {
		const nuevas = {};
		try {
			if ($permiso('verificaciones')) {
				const lista = await api.get('/verificaciones-identidad/');
				nuevas.verificaciones = lista.filter((v) => v.estado_verificacion === 'pendiente').length;
			}
			if ($permiso('reportes')) {
				const lista = await api.get('/reportes/');
				nuevas.reportes = lista.filter((r) => r.estado_reporte === 'pendiente').length;
			}
			if ($permiso('notificaciones')) {
				const lista = await api.get('/notificaciones/');
				noLeidas = lista.filter((n) => n.id_usuario === $sesion?.id_usuario && !n.leida).length;
			}
		} catch {
			// Los contadores son solo de ayuda; si fallan no pasa nada
		}
		insignias = nuevas;
	}

	onMount(async () => {
		if (!$sesion || tokenVencido($sesion.token) || !ROLES_PANEL.includes($sesion.id_rol)) {
			cerrarSesion();
			goto('/?sesion=expirada');
			return;
		}
		try {
			// Siempre se vuelven a pedir los módulos: si el admin cambió permisos, el menú cambia
			modulos.set(await api.get('/auth/mis-modulos'));
		} catch {
			// Si la API no responde se usa el menú guardado
		}
		listo = true;
		cargarContadores();
	});

	function salir() {
		cerrarSesion();
		goto('/');
	}
</script>

{#if listo && $sesion}
	<div class="marco">
		<Sidebar {grupos} usuario={$sesion} {insignias} bind:abierto={menuAbierto} alSalir={salir} />
		<div class="zona">
			<Topbar
				{grupos}
				{noLeidas}
				verNotificaciones={$permiso('notificaciones')}
				verInformes={$permiso('informes')}
				alAbrirMenu={() => (menuAbierto = true)}
			/>
			<main class="contenido">
				{#if permitido}
					{@render children()}
				{:else}
					<SinPermiso />
				{/if}
			</main>
			<Footer />
		</div>
	</div>
{:else}
	<div class="pantalla-carga">
		<Cargando texto="Preparando tu panel" />
	</div>
{/if}

<style>
	.pantalla-carga {
		min-height: 100vh;
		display: grid;
		place-items: center;
	}
</style>
