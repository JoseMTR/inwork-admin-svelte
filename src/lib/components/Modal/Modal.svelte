<script>
	// Ventana para formularios. Se abre con bind:abierto.
	let { abierto = $bindable(false), titulo = '', subtitulo = '', ancho = '560px', children, pie } = $props();

	function cerrar() {
		abierto = false;
	}

	function tecla(evento) {
		if (abierto && evento.key === 'Escape') cerrar();
	}
</script>

<svelte:window onkeydown={tecla} />

{#if abierto}
	<div class="fondo-modal" role="presentation" onclick={(e) => e.target === e.currentTarget && cerrar()}>
		<div class="caja vidrio" style:max-width={ancho} role="dialog" aria-modal="true" aria-label={titulo}>
			<header class="cabecera">
				<div>
					<h2>{titulo}</h2>
					{#if subtitulo}
						<p>{subtitulo}</p>
					{/if}
				</div>
				<button class="boton boton-claro boton-icono" type="button" aria-label="Cerrar" onclick={cerrar}>
					<span class="material-symbols-rounded">close</span>
				</button>
			</header>
			<div class="cuerpo">
				{@render children?.()}
			</div>
			{#if pie}
				<footer class="pie">
					{@render pie()}
				</footer>
			{/if}
		</div>
	</div>
{/if}

<style>
	.caja {
		width: 100%;
		margin: auto;
		padding: 22px;
		border-radius: 24px;
		background: rgba(255, 255, 255, 0.92);
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.cabecera {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}
	h2 {
		font-size: 20px;
		font-weight: 800;
		letter-spacing: -0.02em;
	}
	p {
		margin-top: 2px;
		font-size: 13px;
		color: var(--texto-3);
	}
	.cuerpo {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.pie {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		flex-wrap: wrap;
	}
</style>
