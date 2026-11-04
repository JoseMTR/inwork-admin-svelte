<script>
	let { titulo, descripcion = '', grupo = '', children } = $props();
</script>

<header class="encabezado">
	<div class="encabezado-texto">
		<nav class="migas" aria-label="Ubicación">
			<span>Panel</span>
			{#if grupo}
				<span class="material-symbols-rounded">chevron_right</span>
				<span>{grupo}</span>
			{/if}
			<span class="material-symbols-rounded">chevron_right</span>
			<span class="actual">{titulo}</span>
		</nav>
		<h1>{titulo}</h1>
		{#if descripcion}
			<p>{descripcion}</p>
		{/if}
	</div>
	{#if children}
		<div class="encabezado-acciones">
			{@render children()}
		</div>
	{/if}
</header>

<style>
	.encabezado {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		padding: 4px 4px 0;
	}
	.migas {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 12.5px;
		font-weight: 500;
		color: var(--texto-3);
	}
	.migas .material-symbols-rounded {
		font-size: 16px;
	}
	.migas .actual {
		color: var(--naranja);
		font-weight: 600;
	}
	h1 {
		margin-top: 6px;
		font-size: 28px;
		font-weight: 800;
		letter-spacing: -0.025em;
		line-height: 1.15;
	}
	p {
		margin-top: 4px;
		max-width: 68ch;
		color: var(--texto-2);
	}
	.encabezado-acciones {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
</style>
