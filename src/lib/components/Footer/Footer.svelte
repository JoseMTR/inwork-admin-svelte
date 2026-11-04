<script>
	import { onMount } from 'svelte';
	import { estadoApis } from '#lib/api.js';

	let estado = $state({ principal: null, pagos: null });

	async function revisar() {
		estado = await estadoApis();
	}

	onMount(() => {
		revisar();
		const intervalo = setInterval(revisar, 60000);
		return () => clearInterval(intervalo);
	});

	function clase(valor) {
		return valor === null ? 'revisando' : valor ? 'en-linea' : 'caida';
	}
</script>

<footer class="pie-panel">
	<span>© {new Date().getFullYear()} InWork · Panel de administración · Hecho con SvelteKit</span>
	<div class="estados">
		<span class="estado {clase(estado.principal)}"><i></i>API principal</span>
		<span class="estado {clase(estado.pagos)}"><i></i>API de pagos</span>
	</div>
</footer>

<style>
	.pie-panel {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
		padding: 6px 6px 0;
		font-size: 12px;
		color: var(--texto-3);
	}
	.estados {
		display: flex;
		gap: 14px;
	}
	.estado {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-weight: 600;
	}
	.estado i {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--texto-3);
	}
	.en-linea i {
		background: var(--verde);
		box-shadow: 0 0 0 3px var(--verde-suave);
	}
	.caida i {
		background: var(--rojo);
		box-shadow: 0 0 0 3px var(--rojo-suave);
	}
</style>
