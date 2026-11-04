<script>
	// Página que se muestra cuando la dirección no existe (404) o algo falla.
	import { page } from '$app/state';
	import { sesion } from '#lib/stores/sesion.js';
</script>

<svelte:head>
	<title>{page.status === 404 ? 'Página no encontrada' : 'Error'} | InWork</title>
</svelte:head>

<main class="error-pagina">
	<section class="vidrio caja">
		<span class="icono"><span class="material-symbols-rounded">{page.status === 404 ? 'travel_explore' : 'error'}</span></span>
		<strong class="codigo-error">{page.status}</strong>
		<h1>{page.status === 404 ? 'Esta página no existe' : 'Algo salió mal'}</h1>
		<p class="texto-2">
			{page.status === 404 ? 'Revisa la dirección o vuelve al panel desde el menú.' : (page.error?.message ?? 'Intenta de nuevo en unos segundos.')}
		</p>
		<a class="boton boton-primario" href={$sesion ? '/inicio' : '/'}>
			<span class="material-symbols-rounded">{$sesion ? 'dashboard' : 'login'}</span>
			{$sesion ? 'Volver al inicio' : 'Ir al inicio de sesión'}
		</a>
	</section>
</main>

<style>
	.error-pagina {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 24px 16px;
	}
	.caja {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		max-width: 440px;
		width: 100%;
		padding: 36px 28px;
		text-align: center;
	}
	.icono {
		display: grid;
		place-items: center;
		width: 64px;
		height: 64px;
		border-radius: 20px;
		color: #fff;
		background: linear-gradient(135deg, var(--naranja-2), var(--naranja));
	}
	.icono .material-symbols-rounded {
		font-size: 32px;
	}
	.codigo-error {
		font-size: 44px;
		font-weight: 800;
		letter-spacing: -0.03em;
		color: var(--naranja);
		line-height: 1;
		margin-top: 6px;
	}
	h1 {
		font-size: 21px;
		font-weight: 800;
	}
	p {
		margin-bottom: 8px;
	}
</style>
