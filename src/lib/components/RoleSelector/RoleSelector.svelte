<script>
	// Atajos para probar el panel con una cuenta de cada rol (las de DB.sql).
	let { seleccionado = '', alElegir } = $props();

	const roles = [
		{ nombre: 'Administrador', icono: 'admin_panel_settings', descripcion: 'Acceso total', correo: 'sebastian.rojas@inwork.com.co' },
		{ nombre: 'Moderador', icono: 'shield_person', descripcion: 'Reportes y verificación', correo: 'mariana.castro@inwork.com.co' },
		{ nombre: 'Analista', icono: 'monitoring', descripcion: 'Métricas e informes', correo: 'jorge.pertuz@inwork.com.co' }
	];
</script>

<div class="roles" role="radiogroup" aria-label="Cuenta de demostración">
	{#each roles as rol (rol.nombre)}
		<label class="rol">
			<input type="radio" name="rol-demo" checked={rol.nombre === seleccionado} onchange={() => alElegir?.(rol)} />
			<span class="material-symbols-rounded">{rol.icono}</span>
			<strong>{rol.nombre}</strong>
			<small>{rol.descripcion}</small>
		</label>
	{/each}
</div>

<style>
	.roles {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
	}
	.rol {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 12px;
		border-radius: 14px;
		border: 1px solid var(--linea-fuerte);
		background: rgba(255, 255, 255, 0.6);
		cursor: pointer;
		transition: border-color 0.15s ease, background-color 0.15s ease;
	}
	.rol input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.rol .material-symbols-rounded {
		color: var(--texto-3);
		margin-bottom: 4px;
	}
	.rol strong {
		font-size: 13px;
	}
	.rol small {
		font-size: 11.5px;
		color: var(--texto-3);
	}
	.rol:has(input:checked) {
		border-color: var(--naranja);
		background: rgba(255, 255, 255, 0.95);
		box-shadow: 0 0 0 3px var(--naranja-suave);
	}
	.rol:has(input:checked) .material-symbols-rounded {
		color: var(--naranja);
	}
	.rol:has(input:focus-visible) {
		outline: 2px solid var(--naranja);
		outline-offset: 2px;
	}
	@media (max-width: 480px) {
		.roles {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
