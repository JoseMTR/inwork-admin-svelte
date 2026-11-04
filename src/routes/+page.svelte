<script>
	// LOGIN: autenticación con JWT contra la API principal (POST /auth/login).
	// Solo entran los roles del equipo de InWork: Administrador, Moderador y Analista.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { RoleSelector } from '#lib';
	import { iniciarSesion, api } from '#lib/api.js';
	import { sesion, modulos, guardarSesion, cerrarSesion, tokenVencido, ROLES_PANEL } from '#lib/stores/sesion.js';
	import { avisar } from '#lib/stores/avisos.js';

	let correo = $state('');
	let password = $state('');
	let recordar = $state(true);
	let verClave = $state(false);
	let rolDemo = $state('');
	let enviando = $state(false);
	let error = $state('');
	let ayudaClave = $state(false);

	let correoValido = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo.trim()));
	let claveValida = $derived(password.length >= 8);

	onMount(() => {
		if ($sesion && !tokenVencido($sesion.token)) {
			goto('/inicio');
			return;
		}
		if (page.url.searchParams.get('sesion') === 'expirada') {
			error = 'Tu sesión terminó o tu rol cambió. Inicia sesión de nuevo.';
		}
	});

	function elegirDemo(rol) {
		rolDemo = rol.nombre;
		correo = rol.correo;
		password = 'Inwork2026*';
		error = '';
	}

	async function entrar(evento) {
		evento.preventDefault();
		error = '';
		if (!correoValido) {
			error = 'Escribe un correo válido.';
			return;
		}
		if (!claveValida) {
			error = 'La contraseña tiene mínimo 8 caracteres.';
			return;
		}
		enviando = true;
		try {
			const respuesta = await iniciarSesion(correo.trim().toLowerCase(), password);
			if (!ROLES_PANEL.includes(respuesta.id_rol)) {
				error = `Tu cuenta es de ${respuesta.rol}. Este panel es solo para administradores, moderadores y analistas de InWork.`;
				return;
			}
			guardarSesion(respuesta, recordar);
			// Los módulos del menú salen de la tabla rol_modulo
			modulos.set(await api.get('/auth/mis-modulos'));
			avisar(`Bienvenido, ${respuesta.nombre}`);
			goto('/inicio');
		} catch (e) {
			cerrarSesion();
			error = e.message;
		} finally {
			enviando = false;
		}
	}
</script>

<svelte:head>
	<title>Iniciar sesión | InWork</title>
</svelte:head>

<div class="login">
	<section class="marca vidrio">
		<div class="marca-logo">
			<span class="logo">
				<span class="material-symbols-rounded">bolt</span>
			</span>
			<div>
				<strong>InWork</strong>
				<small>Panel de administración</small>
			</div>
		</div>

		<div class="marca-texto">
			<h1>Toda la plataforma, vista desde un solo lugar.</h1>
			<p>Revisa usuarios, trabajos, contrataciones y pagos de InWork, atiende reportes y pídele a la IA los informes que necesites.</p>
		</div>

		<div class="ejemplos">
			<article class="ejemplo">
				<span class="ejemplo-icono azul">
					<span class="material-symbols-rounded">shield_lock</span>
				</span>
				<div>
					<span class="texto-3 texto-chico">Acceso seguro</span>
					<strong>Token JWT</strong>
				</div>
			</article>
			<article class="ejemplo">
				<span class="ejemplo-icono verde">
					<span class="material-symbols-rounded">groups</span>
				</span>
				<div>
					<span class="texto-3 texto-chico">Roles del panel</span>
					<strong>3 roles</strong>
				</div>
			</article>
		</div>
	</section>

	<section class="formulario vidrio">
		<div class="formulario-cabecera">
			<h2>Inicia sesión</h2>
			<p>Usa la cuenta que te asignó la plataforma.</p>
		</div>

		<form class="campos" onsubmit={entrar} novalidate>
			<div class="campo">
				<label for="correo">Correo</label>
				<div class="entrada-icono">
					<span class="material-symbols-rounded">mail</span>
					<input id="correo" class="entrada" type="email" placeholder="nombre@inwork.com.co" autocomplete="username" bind:value={correo} />
				</div>
				{#if correo && !correoValido}
					<span class="ayuda negativo">Escribe un correo válido.</span>
				{/if}
			</div>

			<div class="campo">
				<label for="clave">Contraseña</label>
				<div class="entrada-icono">
					<span class="material-symbols-rounded">lock</span>
					<input
						id="clave"
						class="entrada"
						type={verClave ? 'text' : 'password'}
						placeholder="Tu contraseña"
						autocomplete="current-password"
						bind:value={password}
					/>
					<button class="boton-ojo" type="button" aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'} onclick={() => (verClave = !verClave)}>
						<span class="material-symbols-rounded">{verClave ? 'visibility_off' : 'visibility'}</span>
					</button>
				</div>
				<span class="ayuda">Mínimo 8 caracteres.</span>
			</div>

			<div class="campo">
				<span class="etiqueta">Cuentas de demostración</span>
				<RoleSelector seleccionado={rolDemo} alElegir={elegirDemo} />
			</div>

			<div class="opciones">
				<label class="recordar">
					<input type="checkbox" bind:checked={recordar} />
					Recordarme
				</label>
				<button class="olvido" type="button" onclick={() => (ayudaClave = !ayudaClave)}>¿Olvidaste tu contraseña?</button>
			</div>

			{#if ayudaClave}
				<p class="nota">
					<span class="material-symbols-rounded">support_agent</span>
					Pídele a un administrador que te asigne una contraseña nueva desde el módulo Usuarios.
				</p>
			{/if}

			{#if error}
				<p class="error-campo">
					<span class="material-symbols-rounded">error</span>
					{error}
				</p>
			{/if}

			<button class="boton boton-primario boton-bloque ingresar" type="submit" disabled={enviando}>
				{enviando ? 'Verificando...' : 'Ingresar al panel'}
				<span class="material-symbols-rounded">{enviando ? 'hourglass_top' : 'arrow_forward'}</span>
			</button>
			{#if enviando}
				<span class="ayuda centrada">La primera vez la API en Render puede tardar hasta un minuto en despertar.</span>
			{/if}
		</form>

		<p class="nota">
			<span class="material-symbols-rounded">info</span>
			No hay registro: las cuentas del equipo las crea un administrador de InWork.
		</p>
	</section>
</div>

<style>
	.login {
		min-height: 100vh;
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(380px, 480px);
		gap: 24px;
		padding: 24px;
	}
	.marca {
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 40px;
		padding: 40px;
		border-radius: 32px;
		background: radial-gradient(600px 400px at 100% 0%, rgba(255, 138, 61, 0.35), transparent 65%), var(--vidrio);
	}
	.marca-logo {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.logo {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border-radius: 15px;
		color: #fff;
		background: linear-gradient(135deg, var(--naranja-2), var(--naranja));
		box-shadow: var(--sombra-naranja);
	}
	.logo .material-symbols-rounded {
		font-size: 26px;
		font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24;
	}
	.marca-logo strong {
		display: block;
		font-size: 19px;
		font-weight: 800;
	}
	.marca-logo small {
		color: var(--texto-3);
	}
	.marca-texto h1 {
		max-width: 14ch;
		font-size: clamp(34px, 4.2vw, 56px);
		font-weight: 800;
		letter-spacing: -0.035em;
		line-height: 1.04;
	}
	.marca-texto p {
		margin-top: 18px;
		max-width: 46ch;
		font-size: 16px;
		color: var(--texto-2);
	}
	.ejemplos {
		display: flex;
		gap: 14px;
		flex-wrap: wrap;
	}
	.ejemplo {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		min-width: 230px;
		border-radius: 18px;
		background: rgba(255, 255, 255, 0.72);
		border: 1px solid rgba(255, 255, 255, 0.95);
		box-shadow: 0 14px 30px -20px rgba(23, 31, 46, 0.45);
	}
	.ejemplo div {
		flex: 1;
	}
	.ejemplo span {
		display: block;
	}
	.ejemplo strong {
		display: block;
		font-size: 22px;
		font-weight: 800;
		letter-spacing: -0.02em;
	}
	.ejemplo-icono {
		display: grid !important;
		place-items: center;
		width: 42px;
		height: 42px;
		border-radius: 13px;
	}
	.ejemplo-icono.azul {
		color: var(--azul);
		background: var(--azul-suave);
	}
	.ejemplo-icono.verde {
		color: var(--verde);
		background: var(--verde-suave);
	}
	.formulario {
		align-self: center;
		display: flex;
		flex-direction: column;
		gap: 22px;
		padding: 34px 32px;
		border-radius: 28px;
		background: var(--vidrio-fuerte);
	}
	.formulario-cabecera h2 {
		font-size: 26px;
		font-weight: 800;
		letter-spacing: -0.025em;
	}
	.formulario-cabecera p {
		margin-top: 4px;
		color: var(--texto-2);
	}
	.campos {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.etiqueta {
		font-size: 12.5px;
		font-weight: 600;
		color: var(--texto-2);
	}
	.opciones {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		font-size: 13px;
	}
	.recordar {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-weight: 600;
		color: var(--texto-2);
	}
	.recordar input {
		width: 16px;
		height: 16px;
		accent-color: var(--naranja);
	}
	.olvido {
		border: 0;
		background: transparent;
		padding: 0;
		font-weight: 600;
		color: var(--naranja);
		cursor: pointer;
	}
	.ingresar {
		height: 48px;
		font-size: 15px;
	}
	.centrada {
		text-align: center;
	}
	.nota {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 14px;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.6);
		font-size: 12.5px;
		color: var(--texto-2);
	}
	.nota .material-symbols-rounded {
		font-size: 18px;
		color: var(--texto-3);
	}
	@media (max-width: 960px) {
		.login {
			grid-template-columns: minmax(0, 1fr);
		}
		.marca {
			padding: 28px;
			gap: 24px;
		}
		.formulario {
			align-self: stretch;
		}
	}
	@media (max-width: 480px) {
		.login {
			padding: 12px;
		}
		.formulario {
			padding: 24px 18px;
		}
	}
</style>
