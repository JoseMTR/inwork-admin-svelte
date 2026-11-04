<script>
	// acciones: botones que van arriba a la derecha (snippet opcional)
	let { titulo, subtitulo = '', acciones, children, clase = '' } = $props();
</script>

<section class="tarjeta vidrio {clase}">
	<header class="tarjeta-cabecera">
		<div class="tarjeta-titulos">
			<h3>{titulo}</h3>
			{#if subtitulo}
				<p>{subtitulo}</p>
			{/if}
		</div>
		{#if acciones}
			<div class="tarjeta-acciones">
				{@render acciones()}
			</div>
		{/if}
	</header>
	<div class="tarjeta-cuerpo">
		{@render children?.()}
	</div>
</section>

<style>
	.tarjeta {
		height: 100%;
		min-width: 0;
		padding: 20px 22px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.tarjeta-cabecera {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}
	.tarjeta-titulos h3 {
		font-size: 16px;
		font-weight: 700;
		letter-spacing: -0.01em;
	}
	.tarjeta-titulos p {
		margin-top: 2px;
		font-size: 12.5px;
		color: var(--texto-3);
	}
	.tarjeta-acciones {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	.tarjeta-cuerpo {
		flex: 1;
		min-width: 0;
	}
</style>
