<script>
	// dato = { titulo, valor, icono, color, detalle, variacion?, sube? }
	let { dato } = $props();
</script>

<article class="stat vidrio">
	<div class="stat-cabecera">
		<span class="stat-titulo">{dato.titulo}</span>
		<span class="stat-icono tono-{dato.color}">
			<span class="material-symbols-rounded">{dato.icono}</span>
		</span>
	</div>
	<strong class="stat-valor numero">{dato.valor}</strong>
	<div class="stat-pie">
		{#if dato.variacion}
			<span class="variacion" class:baja={!dato.sube}>
				<span class="material-symbols-rounded">{dato.sube ? 'trending_up' : 'trending_down'}</span>
				{dato.variacion}
			</span>
		{/if}
		{#if dato.detalle}
			<span class="stat-detalle">{dato.detalle}</span>
		{/if}
	</div>
</article>

<style>
	.stat {
		height: 100%;
		min-width: 0;
		padding: 18px 20px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.stat-cabecera {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 10px;
	}
	.stat-titulo {
		font-size: 13px;
		font-weight: 600;
		color: var(--texto-2);
	}
	.stat-icono {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.9);
		flex-shrink: 0;
	}
	.tono-naranja { background: var(--naranja-suave); color: var(--naranja); }
	.tono-azul { background: var(--azul-suave); color: var(--azul); }
	.tono-verde { background: var(--verde-suave); color: var(--verde); }
	.tono-morado { background: var(--morado-suave); color: var(--morado); }
	.tono-ambar { background: var(--ambar-suave); color: var(--ambar); }
	.tono-rojo { background: var(--rojo-suave); color: var(--rojo); }
	.stat-valor {
		font-size: 28px;
		font-weight: 800;
		letter-spacing: -0.02em;
		line-height: 1.1;
	}
	.stat-pie {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
		font-size: 12px;
	}
	.variacion {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		height: 24px;
		padding: 0 8px;
		border-radius: 999px;
		background: var(--verde-suave);
		color: var(--verde);
		font-weight: 700;
	}
	.variacion .material-symbols-rounded {
		font-size: 15px;
	}
	.variacion.baja {
		background: var(--rojo-suave);
		color: var(--rojo);
	}
	.stat-detalle {
		color: var(--texto-3);
	}
</style>
