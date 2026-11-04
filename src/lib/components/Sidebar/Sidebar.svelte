<script>
	// Menú lateral. Los grupos y enlaces se arman con los módulos de la tabla rol_modulo.
	import { page } from '$app/state';
	import Avatar from '../Avatar/Avatar.svelte';

	let { grupos = [], usuario, insignias = {}, abierto = $bindable(false), alSalir } = $props();

	function activo(ruta) {
		const actual = page.url.pathname;
		return actual === ruta || actual.startsWith(ruta + '/');
	}
</script>

<aside class="lateral vidrio lateral-panel" class:abierto>
	<a class="marca" href="/inicio" onclick={() => (abierto = false)}>
		<span class="logo">
			<span class="material-symbols-rounded">bolt</span>
		</span>
		<span class="marca-texto">
			<strong>InWork</strong>
			<small>Panel de administración</small>
		</span>
	</a>

	<nav class="menu" aria-label="Menú principal">
		{#each grupos as grupo (grupo.titulo)}
			<div class="grupo">
				<span class="grupo-titulo">
					<i style:background={grupo.color}></i>
					{grupo.titulo}
				</span>
				{#each grupo.items as item (item.ruta)}
					<a class="enlace" class:activo={activo(item.ruta)} href={item.ruta} title={item.texto} onclick={() => (abierto = false)}>
						<span class="material-symbols-rounded">{item.icono}</span>
						<span class="enlace-texto">{item.texto}</span>
						{#if insignias[item.nombre]}
							<span class="insignia">{insignias[item.nombre]}</span>
						{/if}
					</a>
				{/each}
			</div>
		{/each}
	</nav>

	<div class="cuenta">
		<Avatar nombre={usuario?.nombre ?? ''} />
		<div class="cuenta-texto">
			<strong>{usuario?.nombre}</strong>
			<small>{usuario?.rol}</small>
		</div>
		<button class="salir" type="button" aria-label="Cerrar sesión" title="Cerrar sesión" onclick={alSalir}>
			<span class="material-symbols-rounded">logout</span>
		</button>
	</div>
</aside>

{#if abierto}
	<button class="velo" type="button" aria-label="Cerrar menú" onclick={() => (abierto = false)}></button>
{/if}

<style>
	.lateral {
		position: sticky;
		top: 20px;
		height: calc(100vh - 40px);
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px 12px;
		border-radius: var(--radio-panel);
		z-index: 40;
	}
	.marca {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 2px 6px 6px;
	}
	.logo {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 14px;
		color: #fff;
		background: linear-gradient(135deg, var(--naranja-2), var(--naranja));
		box-shadow: var(--sombra-naranja), inset 0 1px 0 rgba(255, 255, 255, 0.4);
		flex-shrink: 0;
	}
	.logo .material-symbols-rounded {
		font-size: 24px;
		font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24;
	}
	.marca-texto strong {
		display: block;
		font-size: 17px;
		font-weight: 800;
		letter-spacing: -0.02em;
	}
	.marca-texto small {
		display: block;
		font-size: 11.5px;
		color: var(--texto-3);
	}
	.menu {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding-right: 2px;
		scrollbar-width: thin;
	}
	.grupo {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.grupo-titulo {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 10px 3px;
		font-size: 11px;
		font-weight: 700;
		color: var(--texto-3);
	}
	.grupo-titulo i {
		width: 8px;
		height: 8px;
		border-radius: 3px;
	}
	.enlace {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 32px;
		padding: 0 10px;
		border-radius: 11px;
		border: 1px solid transparent;
		color: var(--texto-2);
		font-size: 13px;
		font-weight: 600;
		transition: background-color 0.15s ease;
	}
	.enlace:hover {
		background: rgba(255, 255, 255, 0.55);
	}
	.enlace .material-symbols-rounded {
		color: var(--texto-3);
	}
	.enlace-texto {
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.enlace.activo {
		color: var(--texto);
		background: rgba(255, 255, 255, 0.92);
		border-color: rgba(255, 255, 255, 1);
		box-shadow: 0 6px 16px -10px rgba(23, 31, 46, 0.45);
	}
	.enlace.activo .material-symbols-rounded {
		color: var(--naranja);
		font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24;
	}
	.insignia {
		display: inline-grid;
		place-items: center;
		min-width: 22px;
		height: 20px;
		padding: 0 7px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 700;
		color: var(--naranja);
		background: var(--naranja-suave);
	}
	.cuenta {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px;
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.95);
	}
	.cuenta-texto {
		flex: 1;
		min-width: 0;
	}
	.cuenta-texto strong {
		display: block;
		font-size: 13px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.cuenta-texto small {
		display: block;
		font-size: 11.5px;
		color: var(--texto-3);
	}
	.salir {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border: 0;
		border-radius: 10px;
		background: transparent;
		color: var(--texto-3);
		cursor: pointer;
	}
	.salir:hover {
		color: var(--rojo);
		background: var(--rojo-suave);
	}
	.velo {
		display: none;
	}

	@media (max-width: 1100px) and (min-width: 761px) {
		.lateral {
			padding: 16px 10px;
			align-items: center;
		}
		.marca-texto,
		.grupo-titulo,
		.enlace-texto,
		.insignia,
		.cuenta-texto,
		.salir {
			display: none;
		}
		.enlace {
			justify-content: center;
			width: 44px;
			padding: 0;
		}
		.cuenta {
			padding: 6px;
		}
	}

	/* Celular: el menú sale desde la izquierda con el botón ☰ */
	@media (max-width: 760px) {
		.lateral {
			position: fixed;
			top: 10px;
			bottom: 10px;
			left: 10px;
			height: auto;
			width: min(290px, calc(100vw - 40px));
			background: rgba(255, 255, 255, 0.92);
			transform: translateX(calc(-100% - 20px));
			transition: transform 0.2s ease;
		}
		.lateral.abierto {
			transform: none;
		}
		.velo {
			display: block;
			position: fixed;
			inset: 0;
			z-index: 30;
			border: 0;
			background: rgba(24, 32, 47, 0.3);
		}
	}
</style>
