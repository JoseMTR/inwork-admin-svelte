<script>
	// barras = [{ etiqueta, valor }]
	let { barras = [], color = 'naranja', horizontal = false, alto = 220, formato = (v) => v } = $props();

	let maximo = $derived(Math.max(1, ...barras.map((b) => Number(b.valor) || 0)));

	function porcentaje(barra) {
		return ((Number(barra.valor) || 0) / maximo) * 100;
	}
</script>

{#if barras.length === 0}
	<p class="sin-datos">Todavía no hay datos para este gráfico.</p>
{:else if horizontal}
	<ul class="filas barras-{color}">
		{#each barras as barra, i (i)}
			<li>
				<span class="etiqueta-fila" title={barra.etiqueta}>{barra.etiqueta}</span>
				<span class="pista-fila">
					<span class="relleno" style:width="{porcentaje(barra)}%"></span>
				</span>
				<strong class="valor-fila">{formato(barra.valor)}</strong>
			</li>
		{/each}
	</ul>
{:else}
	<div class="barras barras-{color}" style:height="{alto}px">
		{#each barras as barra, i (i)}
			<div class="columna">
				<span class="valor">{formato(barra.valor)}</span>
				<div class="pista">
					<div class="relleno" style:height="{porcentaje(barra)}%"></div>
				</div>
				<span class="etiqueta" title={barra.etiqueta}>{barra.etiqueta}</span>
			</div>
		{/each}
	</div>
{/if}

<style>
	.barras {
		display: flex;
		align-items: stretch;
		gap: 12px;
	}
	.columna {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}
	.valor {
		font-size: 12px;
		font-weight: 700;
		color: var(--texto-2);
		white-space: nowrap;
	}
	.pista {
		position: relative;
		flex: 1;
		width: 100%;
		max-width: 44px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.55);
		border: 1px solid var(--linea);
		overflow: hidden;
	}
	.pista .relleno {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		border-radius: 10px;
	}
	.relleno {
		background: linear-gradient(180deg, var(--naranja-2), var(--naranja));
	}
	.barras-azul .relleno { background: linear-gradient(180deg, #6aa8ff, var(--azul)); }
	.barras-verde .relleno { background: linear-gradient(180deg, #45d39a, var(--verde)); }
	.barras-morado .relleno { background: linear-gradient(180deg, #a891ff, var(--morado)); }
	.barras-ambar .relleno { background: linear-gradient(180deg, #ffd166, #f2a900); }
	.filas {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.filas li {
		display: grid;
		grid-template-columns: 110px minmax(0, 1fr) auto;
		align-items: center;
		gap: 12px;
	}
	.etiqueta-fila {
		font-size: 13px;
		font-weight: 600;
		color: var(--texto-2);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.pista-fila {
		position: relative;
		height: 12px;
		border-radius: 999px;
		background: rgba(24, 32, 47, 0.07);
		overflow: hidden;
	}
	.pista-fila .relleno {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		border-radius: 999px;
		background: linear-gradient(90deg, var(--naranja-2), var(--naranja));
	}
	.filas.barras-azul .pista-fila .relleno { background: linear-gradient(90deg, #6aa8ff, var(--azul)); }
	.filas.barras-verde .pista-fila .relleno { background: linear-gradient(90deg, #45d39a, var(--verde)); }
	.filas.barras-morado .pista-fila .relleno { background: linear-gradient(90deg, #a891ff, var(--morado)); }
	.filas.barras-ambar .pista-fila .relleno { background: linear-gradient(90deg, #ffd166, #f2a900); }
	.valor-fila {
		min-width: 36px;
		font-size: 13px;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.etiqueta {
		font-size: 11.5px;
		color: var(--texto-3);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}
	.sin-datos {
		padding: 30px 0;
		text-align: center;
		color: var(--texto-3);
	}
</style>
