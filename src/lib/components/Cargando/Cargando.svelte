<script>
	let { texto = 'Cargando información', ayuda = true } = $props();
</script>

<div class="cargando" role="status">
	<span class="rueda" aria-hidden="true"></span>
	<strong>{texto}</strong>
	{#if ayuda}
		<small>Si la API estaba dormida en Render puede tardar hasta un minuto la primera vez.</small>
	{/if}
</div>

<style>
	.cargando {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 48px 20px;
		text-align: center;
		color: var(--texto-2);
	}
	.rueda {
		width: 42px;
		height: 42px;
		border-radius: 50%;
		border: 4px solid var(--naranja-suave);
		border-top-color: var(--naranja);
		animation: girar 0.8s linear infinite;
	}
	small {
		max-width: 44ch;
		color: var(--texto-3);
	}
	@keyframes girar {
		to {
			transform: rotate(360deg);
		}
	}
</style>
