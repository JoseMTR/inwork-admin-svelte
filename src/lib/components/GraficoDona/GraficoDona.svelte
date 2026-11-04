<script>
	// segmentos = [{ nombre, valor, color }]
	let { segmentos = [], textoCentral = '' } = $props();

	let total = $derived(segmentos.reduce((suma, s) => suma + (Number(s.valor) || 0), 0));

	function porcentaje(segmento) {
		return total ? Math.round(((Number(segmento.valor) || 0) / total) * 100) : 0;
	}

	let fondo = $derived.by(() => {
		if (!total) return 'rgba(24, 32, 47, 0.08)';
		let inicio = 0;
		const partes = segmentos.map((s) => {
			const fin = inicio + ((Number(s.valor) || 0) / total) * 100;
			const parte = `${s.color} ${inicio}% ${fin}%`;
			inicio = fin;
			return parte;
		});
		return `conic-gradient(${partes.join(', ')})`;
	});
</script>

<div class="dona-contenedor">
	<div class="dona" style:background={fondo}>
		<div class="centro">
			<strong>{segmentos.length ? porcentaje(segmentos[0]) : 0}%</strong>
			<span>{textoCentral}</span>
		</div>
	</div>
	<ul class="leyenda">
		{#each segmentos as segmento, i (i)}
			<li>
				<span class="color" style:background={segmento.color}></span>
				<span class="nombre">{segmento.nombre}</span>
				<strong>{porcentaje(segmento)}%</strong>
				<span class="valor">({segmento.valor})</span>
			</li>
		{/each}
	</ul>
</div>

<style>
	.dona-contenedor {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 22px;
	}
	.dona {
		position: relative;
		width: 168px;
		height: 168px;
		border-radius: 50%;
		box-shadow: 0 14px 30px -18px rgba(23, 31, 46, 0.5);
	}
	.centro {
		position: absolute;
		inset: 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.92);
		box-shadow: inset 0 2px 8px rgba(23, 31, 46, 0.08);
		text-align: center;
	}
	.centro strong {
		font-size: 30px;
		font-weight: 800;
		letter-spacing: -0.03em;
		line-height: 1;
	}
	.centro span {
		margin-top: 4px;
		font-size: 11.5px;
		color: var(--texto-3);
	}
	.leyenda {
		list-style: none;
		margin: 0;
		padding: 0;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.leyenda li {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
	}
	.color {
		width: 10px;
		height: 10px;
		border-radius: 3px;
	}
	.nombre {
		flex: 1;
		color: var(--texto-2);
	}
	.valor {
		color: var(--texto-3);
		font-size: 12px;
		min-width: 46px;
		text-align: right;
	}
</style>
