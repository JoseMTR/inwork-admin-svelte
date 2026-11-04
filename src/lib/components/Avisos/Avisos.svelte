<script>
	import { avisos, quitarAviso } from '#lib/stores/avisos.js';

	const ICONOS = { exito: 'check_circle', error: 'error', info: 'info' };
</script>

<div class="avisos" aria-live="polite">
	{#each $avisos as aviso (aviso.id)}
		<div class="aviso vidrio aviso-{aviso.tipo}" role="status">
			<span class="material-symbols-rounded">{ICONOS[aviso.tipo] ?? 'info'}</span>
			<p>{aviso.texto}</p>
			<button type="button" aria-label="Cerrar aviso" onclick={() => quitarAviso(aviso.id)}>
				<span class="material-symbols-rounded">close</span>
			</button>
		</div>
	{/each}
</div>

<style>
	.aviso {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 12px 14px;
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.95);
		animation: entrar 0.2s ease-out;
	}
	.aviso > .material-symbols-rounded {
		font-size: 22px;
	}
	.aviso-exito > .material-symbols-rounded { color: var(--verde); }
	.aviso-error > .material-symbols-rounded { color: var(--rojo); }
	.aviso-info > .material-symbols-rounded { color: var(--azul); }
	p {
		flex: 1;
		font-size: 13.5px;
		font-weight: 600;
	}
	button {
		border: 0;
		background: transparent;
		color: var(--texto-3);
		cursor: pointer;
		padding: 0;
	}
	@keyframes entrar {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
	}
</style>
