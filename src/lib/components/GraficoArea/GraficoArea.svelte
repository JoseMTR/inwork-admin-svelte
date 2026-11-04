<script>
	// Gráfico de línea con área. valores = [3, 5, 2], etiquetas = ['Lun', 'Mar', 'Mié']
	let { valores = [], etiquetas = [], formato = (v) => v } = $props();

	const ancho = 600;
	const alto = 220;
	const idGradiente = 'area-' + Math.random().toString(36).slice(2, 8);

	let puntos = $derived.by(() => {
		if (valores.length === 0) return [];
		const maximo = Math.max(...valores);
		const minimo = Math.min(0, ...valores);
		const rango = maximo - minimo || 1;
		const paso = valores.length > 1 ? ancho / (valores.length - 1) : 0;
		return valores.map((valor, i) => ({
			x: valores.length > 1 ? i * paso : ancho / 2,
			y: alto - 16 - ((valor - minimo) / rango) * (alto - 40),
			valor
		}));
	});

	let linea = $derived.by(() => {
		if (puntos.length === 0) return '';
		let ruta = `M ${puntos[0].x} ${puntos[0].y}`;
		for (let i = 1; i < puntos.length; i++) {
			const a = puntos[i - 1];
			const b = puntos[i];
			const medio = (a.x + b.x) / 2;
			ruta += ` C ${medio} ${a.y}, ${medio} ${b.y}, ${b.x} ${b.y}`;
		}
		return ruta;
	});

	let area = $derived(linea ? `${linea} L ${puntos[puntos.length - 1].x} ${alto} L ${puntos[0].x} ${alto} Z` : '');
</script>

<div class="grafico">
	{#if puntos.length === 0}
		<p class="sin-datos">Todavía no hay datos para este gráfico.</p>
	{:else}
		<div class="lienzo">
			<svg viewBox="0 0 {ancho} {alto}" preserveAspectRatio="none" aria-hidden="true">
				<defs>
					<linearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stop-color="#ff8a3d" stop-opacity="0.38" />
						<stop offset="100%" stop-color="#ff8a3d" stop-opacity="0" />
					</linearGradient>
				</defs>
				<path d={area} fill="url(#{idGradiente})" />
				<path d={linea} class="trazo" />
			</svg>
			{#each puntos as punto, i (i)}
				<span class="punto" style:left="{(punto.x / ancho) * 100}%" style:top="{(punto.y / alto) * 100}%" title="{etiquetas[i] ?? ''}: {formato(punto.valor)}"></span>
			{/each}
		</div>
		<div class="etiquetas">
			{#each etiquetas as etiqueta, i (i)}
				<span>{etiqueta}</span>
			{/each}
		</div>
	{/if}
</div>

<style>
	.lienzo {
		position: relative;
		height: 240px;
		background-image: linear-gradient(to bottom, var(--linea) 1px, transparent 1px);
		background-size: 100% 25%;
	}
	svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
	}
	.trazo {
		fill: none;
		stroke: var(--naranja);
		stroke-width: 2.5;
		vector-effect: non-scaling-stroke;
	}
	.punto {
		position: absolute;
		width: 10px;
		height: 10px;
		margin: -5px 0 0 -5px;
		border-radius: 50%;
		background: #fff;
		border: 2.5px solid var(--naranja);
		box-shadow: 0 2px 6px rgba(242, 84, 27, 0.35);
	}
	.etiquetas {
		display: flex;
		justify-content: space-between;
		gap: 4px;
		margin-top: 12px;
		font-size: 11.5px;
		color: var(--texto-3);
	}
	.sin-datos {
		padding: 30px 0;
		text-align: center;
		color: var(--texto-3);
	}
</style>
