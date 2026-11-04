<script>
	// Barra superior: botón de menú (celular), buscador de módulos, campana y acceso a la IA.
	import { goto } from '$app/navigation';

	let { grupos = [], noLeidas = 0, verNotificaciones = false, verInformes = false, alAbrirMenu } = $props();

	let busqueda = $state('');
	let enfocado = $state(false);

	let opciones = $derived(grupos.flatMap((g) => g.items));
	let coincidencias = $derived(
		busqueda.trim() ? opciones.filter((o) => o.texto.toLowerCase().includes(busqueda.trim().toLowerCase())).slice(0, 6) : []
	);

	function ir(ruta) {
		busqueda = '';
		goto(ruta);
	}

	function enviar(evento) {
		evento.preventDefault();
		if (coincidencias.length > 0) ir(coincidencias[0].ruta);
	}
</script>

<header class="superior vidrio">
	<button class="boton boton-claro boton-icono hamburguesa" type="button" aria-label="Abrir menú" onclick={alAbrirMenu}>
		<span class="material-symbols-rounded">menu</span>
	</button>

	<form class="buscar" onsubmit={enviar} role="search">
		<span class="material-symbols-rounded">search</span>
		<input
			type="search"
			placeholder="Ir a un módulo: usuarios, pagos, reportes..."
			bind:value={busqueda}
			onfocus={() => (enfocado = true)}
			onblur={() => setTimeout(() => (enfocado = false), 150)}
		/>
		<kbd>Enter</kbd>
		{#if enfocado && coincidencias.length > 0}
			<ul class="sugerencias vidrio">
				{#each coincidencias as opcion (opcion.ruta)}
					<li>
						<button type="button" onclick={() => ir(opcion.ruta)}>
							<span class="material-symbols-rounded">{opcion.icono}</span>
							{opcion.texto}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</form>

	<div class="derecha">
		{#if verNotificaciones}
			<a class="boton boton-claro boton-icono campana" href="/notificaciones" aria-label="Notificaciones" title="Notificaciones">
				<span class="material-symbols-rounded">notifications</span>
				{#if noLeidas > 0}
					<span class="punto">{noLeidas > 9 ? '9+' : noLeidas}</span>
				{/if}
			</a>
		{/if}
		{#if verInformes}
			<a class="boton boton-primario" href="/informes">
				<span class="material-symbols-rounded">auto_awesome</span>
				<span class="texto-boton">Pedir informe a la IA</span>
			</a>
		{/if}
	</div>
</header>

<style>
	.superior {
		position: relative;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 12px 14px;
		border-radius: 22px;
	}
	.hamburguesa {
		display: none;
	}
	.buscar {
		position: relative;
		flex: 1 1 320px;
		max-width: 460px;
		display: flex;
		align-items: center;
		gap: 10px;
		height: 42px;
		padding: 0 12px;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.62);
		border: 1px solid var(--linea);
		color: var(--texto-3);
	}
	.buscar input {
		flex: 1;
		min-width: 0;
		border: 0;
		outline: none;
		background: transparent;
		font-size: 13.5px;
		color: var(--texto);
	}
	kbd {
		font-family: inherit;
		font-size: 11px;
		font-weight: 600;
		padding: 3px 7px;
		border-radius: 7px;
		border: 1px solid var(--linea-fuerte);
		background: #fff;
		color: var(--texto-3);
	}
	.sugerencias {
		position: absolute;
		top: 48px;
		left: 0;
		right: 0;
		list-style: none;
		margin: 0;
		padding: 6px;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.97);
	}
	.sugerencias button {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 8px 10px;
		border: 0;
		border-radius: 10px;
		background: transparent;
		font-size: 13px;
		font-weight: 600;
		color: var(--texto-2);
		text-align: left;
		cursor: pointer;
	}
	.sugerencias button:hover {
		background: var(--naranja-suave);
		color: var(--texto);
	}
	.derecha {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.campana {
		position: relative;
	}
	.campana .punto {
		position: absolute;
		top: 4px;
		right: 3px;
		display: grid;
		place-items: center;
		min-width: 17px;
		height: 17px;
		padding: 0 4px;
		border-radius: 999px;
		font-size: 10px;
		font-weight: 800;
		color: #fff;
		background: var(--naranja);
		border: 2px solid #fff;
	}
	@media (max-width: 760px) {
		.hamburguesa {
			display: inline-flex;
		}
		.superior {
			flex-wrap: wrap;
			gap: 10px;
		}
		.buscar {
			order: 3;
			flex-basis: 100%;
			max-width: none;
		}
		kbd,
		.texto-boton {
			display: none;
		}
	}
</style>
