<script>
	let { icono = 'inbox', titulo = '', texto = '', children } = $props();
</script>

<div class="vacio">
	<span class="icono">
		<span class="material-symbols-rounded">{icono}</span>
	</span>
	<h2>{titulo}</h2>
	{#if texto}
		<p>{texto}</p>
	{/if}
	{#if children}
		<div class="acciones">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.vacio {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 10px;
		padding: 40px 24px;
	}
	.icono {
		display: grid;
		place-items: center;
		width: 72px;
		height: 72px;
		border-radius: 22px;
		color: var(--naranja);
		background: var(--naranja-suave);
		border: 1px solid rgba(255, 255, 255, 0.9);
	}
	.icono .material-symbols-rounded {
		font-size: 34px;
	}
	h2 {
		font-size: 22px;
		font-weight: 800;
		letter-spacing: -0.02em;
	}
	p {
		max-width: 46ch;
		color: var(--texto-2);
	}
	.acciones {
		margin-top: 6px;
		justify-content: center;
	}
</style>
