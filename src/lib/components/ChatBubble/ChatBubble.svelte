<script>
	// propio = mensaje a la derecha (naranja). ia = respuesta del asistente.
	let { autor = '', hora = '', propio = false, ia = false, children } = $props();
</script>

<div class="fila" class:propia={propio}>
	{#if ia}
		<span class="marca-ia">
			<span class="material-symbols-rounded">auto_awesome</span>
		</span>
	{/if}
	<div class="burbuja" class:burbuja-ia={ia}>
		{#if autor || hora}
			<div class="meta">
				<strong>{autor}</strong>
				<span>{hora}</span>
			</div>
		{/if}
		<div class="contenido">
			{@render children?.()}
		</div>
	</div>
</div>

<style>
	.fila {
		display: flex;
		align-items: flex-start;
		gap: 10px;
	}
	.fila.propia {
		justify-content: flex-end;
	}
	.marca-ia {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 10px;
		flex-shrink: 0;
		color: #fff;
		background: linear-gradient(135deg, var(--naranja-2), var(--naranja));
		box-shadow: var(--sombra-naranja);
	}
	.marca-ia .material-symbols-rounded {
		font-size: 18px;
	}
	.burbuja {
		max-width: min(560px, 85%);
		padding: 12px 14px;
		border-radius: 16px 16px 16px 6px;
		background: rgba(255, 255, 255, 0.8);
		border: 1px solid var(--linea);
		font-size: 13.5px;
	}
	.propia .burbuja {
		border-radius: 16px 16px 6px 16px;
		color: #fff;
		border-color: transparent;
		background: linear-gradient(135deg, #ff7c3a, var(--naranja));
	}
	.burbuja-ia {
		max-width: 100%;
		flex: 1;
		min-width: 0;
		background: rgba(255, 255, 255, 0.72);
	}
	.meta {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin-bottom: 4px;
		font-size: 12px;
	}
	.meta span {
		color: var(--texto-3);
	}
	.propia .meta span {
		color: rgba(255, 255, 255, 0.8);
	}
</style>
