<script>
	// PERFIL: datos de la cuenta con la que se inició sesión (GET /auth/me),
	// cambio de contraseña (PUT /auth/cambiar-password) y los permisos del rol.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { PageHeader, Tarjeta, Avatar, Cargando } from '#lib';
	import { api, cargarVarios } from '#lib/api.js';
	import { sesion, modulos, permiso, cerrarSesion } from '#lib/stores/sesion.js';
	import { avisar } from '#lib/stores/avisos.js';
	import { infoModulo, ICONOS_ROL } from '#lib/utils/menu.js';
	import * as f from '#lib/utils/formato.js';

	const ACCIONES = [
		{ campo: 'puede_crear', texto: 'Crear' },
		{ campo: 'puede_leer', texto: 'Ver' },
		{ campo: 'puede_editar', texto: 'Editar' },
		{ campo: 'puede_eliminar', texto: 'Eliminar' }
	];

	let cargando = $state(true);
	let yo = $state(null);
	let ciudades = $state([]);
	let form = $state({});
	let errorDatos = $state('');
	let guardandoDatos = $state(false);
	let clave = $state({ actual: '', nueva: '', confirmar: '' });
	let errorClave = $state('');
	let guardandoClave = $state(false);

	let puedeEditar = $derived($permiso('usuarios', 'editar'));

	async function cargar() {
		const { datos, errores } = await cargarVarios({
			yo: api.get('/auth/me'),
			ciudades: $permiso('ubicacion') ? api.get('/ciudades/') : []
		});
		if (errores.yo) avisar(errores.yo, 'error');
		yo = datos.yo;
		ciudades = [...(datos.ciudades ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre));
		llenarFormulario();
		cargando = false;
	}

	function llenarFormulario() {
		form = {
			nombre: yo?.nombre ?? '',
			apellido: yo?.apellido ?? '',
			telefono: yo?.telefono ?? '',
			id_ciudad: yo?.id_ciudad ?? null,
			direccion: yo?.direccion ?? '',
			descripcion: yo?.descripcion ?? ''
		};
	}

	onMount(cargar);

	let nombreCiudad = $derived(ciudades.find((c) => c.id_ciudad === yo?.id_ciudad)?.nombre ?? 'Sin ciudad');
	let misModulos = $derived(($modulos ?? []).map((m) => ({ ...m, info: infoModulo(m) })));
	let hayCambios = $derived(
		!!yo && ['nombre', 'apellido', 'telefono', 'direccion', 'descripcion'].some((c) => (form[c] ?? '') !== (yo[c] ?? '')) || form.id_ciudad !== yo?.id_ciudad
	);

	async function guardarDatos(evento) {
		evento.preventDefault();
		errorDatos = '';
		if (!form.nombre.trim() || !form.apellido.trim()) {
			errorDatos = 'Escribe tu nombre y apellido.';
			return;
		}
		if (!/^3\d{9}$/.test(form.telefono.trim())) {
			errorDatos = 'El teléfono debe tener 10 dígitos y empezar por 3.';
			return;
		}
		guardandoDatos = true;
		try {
			await api.put(`/usuarios/${yo.id_usuario}`, {
				id_ciudad: form.id_ciudad ? Number(form.id_ciudad) : null,
				nombre: form.nombre.trim(),
				apellido: form.apellido.trim(),
				telefono: form.telefono.trim(),
				foto_perfil: yo.foto_perfil ?? null,
				descripcion: form.descripcion.trim() || null,
				direccion: form.direccion.trim() || null
			});
			sesion.update((s) => (s ? { ...s, nombre: `${form.nombre.trim()} ${form.apellido.trim()}` } : s));
			avisar('Tus datos se actualizaron');
			await cargar();
		} catch (e) {
			errorDatos = e.message;
		} finally {
			guardandoDatos = false;
		}
	}

	async function cambiarClave(evento) {
		evento.preventDefault();
		errorClave = '';
		if (!clave.actual) {
			errorClave = 'Escribe tu contraseña actual.';
			return;
		}
		if (clave.nueva.length < 8) {
			errorClave = 'La nueva contraseña debe tener mínimo 8 caracteres.';
			return;
		}
		if (clave.nueva !== clave.confirmar) {
			errorClave = 'Las contraseñas nuevas no coinciden.';
			return;
		}
		if (clave.nueva === clave.actual) {
			errorClave = 'La nueva contraseña debe ser diferente a la actual.';
			return;
		}
		guardandoClave = true;
		try {
			await api.put('/auth/cambiar-password', { password_actual: clave.actual, password_nueva: clave.nueva });
			clave = { actual: '', nueva: '', confirmar: '' };
			avisar('Contraseña actualizada. Úsala la próxima vez que inicies sesión.');
		} catch (e) {
			errorClave = e.message;
		} finally {
			guardandoClave = false;
		}
	}

	function salir() {
		cerrarSesion();
		goto('/');
	}
</script>

<svelte:head>
	<title>Mi perfil | InWork</title>
</svelte:head>

<div class="pagina">
	<PageHeader titulo="Mi perfil" grupo="Sistema" descripcion="Los datos de la cuenta con la que iniciaste sesión." />

	{#if cargando}
		<div class="vidrio"><Cargando texto="Cargando tu perfil" /></div>
	{:else if !yo}
		<div class="vidrio vacio-perfil">No se pudo cargar tu perfil. Revisa tu conexión y recarga la página.</div>
	{:else}
		<div class="rejilla perfil">
			<section class="tarjeta-perfil vidrio">
				<div class="portada"></div>
				<div class="identidad">
					<Avatar nombre={f.nombreCompleto(yo)} tamano="grande" />
					<h2>{f.nombreCompleto(yo)}</h2>
					<span class="texto-2">{yo.correo}</span>
					<span class="rol">
						<span class="material-symbols-rounded">{ICONOS_ROL[yo.id_rol] ?? 'badge'}</span>
						{yo.rol}
					</span>
				</div>
				<ul class="lista">
					<li><span class="texto-3">Teléfono</span><strong>{yo.telefono ?? '—'}</strong></li>
					<li><span class="texto-3">Ciudad</span><strong>{nombreCiudad}</strong></li>
					<li><span class="texto-3">Documento</span><strong>{f.capitalizar(yo.tipo_identificacion ?? '')} {yo.numero_identificacion}</strong></li>
					<li><span class="texto-3">Correo verificado</span><strong>{yo.correo_verificado ? 'Sí' : 'No'}</strong></li>
					<li><span class="texto-3">Miembro desde</span><strong>{f.fecha(yo.created)}</strong></li>
					<li><span class="texto-3">Sesión iniciada</span><strong>{$sesion?.inicio ? f.fechaHora($sesion.inicio) : '—'}</strong></li>
				</ul>
				<button class="boton boton-peligro boton-bloque" type="button" onclick={salir}>
					<span class="material-symbols-rounded">logout</span>
					Cerrar sesión
				</button>
			</section>

			<div class="formularios">
				<Tarjeta titulo="Datos personales" subtitulo={puedeEditar ? 'El correo y el rol solo los cambia un administrador' : 'Tu rol puede ver estos datos pero no editarlos'}>
					<form class="rejilla c-2 formulario" onsubmit={guardarDatos} novalidate>
						<div class="campo"><label for="p-nombre">Nombre</label><input id="p-nombre" class="entrada" bind:value={form.nombre} disabled={!puedeEditar} /></div>
						<div class="campo"><label for="p-apellido">Apellido</label><input id="p-apellido" class="entrada" bind:value={form.apellido} disabled={!puedeEditar} /></div>
						<div class="campo"><label for="p-correo">Correo</label><input id="p-correo" class="entrada" type="email" value={yo.correo} disabled /></div>
						<div class="campo"><label for="p-telefono">Teléfono</label><input id="p-telefono" class="entrada" type="tel" inputmode="numeric" maxlength="10" bind:value={form.telefono} disabled={!puedeEditar} /></div>
						<div class="campo">
							<label for="p-ciudad">Ciudad</label>
							<select id="p-ciudad" class="entrada" bind:value={form.id_ciudad} disabled={!puedeEditar}>
								<option value={null}>Sin ciudad</option>
								{#each ciudades as ciudad (ciudad.id_ciudad)}<option value={ciudad.id_ciudad}>{ciudad.nombre}</option>{/each}
							</select>
						</div>
						<div class="campo"><label for="p-rol">Rol</label><input id="p-rol" class="entrada" value={yo.rol} disabled /></div>
						<div class="campo ancho"><label for="p-direccion">Dirección</label><input id="p-direccion" class="entrada" bind:value={form.direccion} disabled={!puedeEditar} placeholder="Calle 72 #45-10, Barranquilla" /></div>
						<div class="campo ancho"><label for="p-descripcion">Sobre mí</label><textarea id="p-descripcion" class="entrada" bind:value={form.descripcion} disabled={!puedeEditar}></textarea></div>
						{#if errorDatos}
							<p class="error-campo ancho"><span class="material-symbols-rounded">error</span>{errorDatos}</p>
						{/if}
						{#if puedeEditar}
							<div class="guardar ancho">
								<button class="boton boton-claro" type="button" onclick={llenarFormulario} disabled={!hayCambios}>Descartar</button>
								<button class="boton boton-primario" type="submit" disabled={!hayCambios || guardandoDatos}>
									<span class="material-symbols-rounded">save</span>
									{guardandoDatos ? 'Guardando...' : 'Guardar cambios'}
								</button>
							</div>
						{:else}
							<p class="solo-lectura ancho"><span class="material-symbols-rounded">lock</span>Para cambiar tus datos pídeselo a un administrador.</p>
						{/if}
					</form>
				</Tarjeta>

				<Tarjeta titulo="Cambiar contraseña" subtitulo="Mínimo 8 caracteres">
					<form class="formulario" onsubmit={cambiarClave} novalidate>
						<div class="rejilla c-3 formulario">
							<div class="campo"><label for="c-actual">Contraseña actual</label><input id="c-actual" class="entrada" type="password" autocomplete="current-password" bind:value={clave.actual} placeholder="••••••••" /></div>
							<div class="campo"><label for="c-nueva">Nueva contraseña</label><input id="c-nueva" class="entrada" type="password" autocomplete="new-password" bind:value={clave.nueva} placeholder="Mínimo 8 caracteres" /></div>
							<div class="campo"><label for="c-confirmar">Confirmar</label><input id="c-confirmar" class="entrada" type="password" autocomplete="new-password" bind:value={clave.confirmar} placeholder="Repite la nueva" /></div>
						</div>
						{#if errorClave}
							<p class="error-campo"><span class="material-symbols-rounded">error</span>{errorClave}</p>
						{/if}
						<div class="guardar">
							<button class="boton boton-claro" type="submit" disabled={guardandoClave}>
								<span class="material-symbols-rounded">key</span>
								{guardandoClave ? 'Actualizando...' : 'Actualizar contraseña'}
							</button>
						</div>
					</form>
				</Tarjeta>

				<Tarjeta titulo="Mis permisos" subtitulo="Lo que tu rol puede hacer en cada módulo (tabla rol_modulo)">
					<ul class="lista permisos">
						{#each misModulos as modulo (modulo.nombre)}
							<li>
								<a class="modulo" href={modulo.ruta}>
									<span class="material-symbols-rounded">{modulo.info.icono}</span>
									{modulo.info.texto}
								</a>
								<span class="acciones">
									{#each ACCIONES as accion (accion.campo)}
										<span class="permiso" class:si={$sesion?.id_rol === 1 || modulo[accion.campo]}>{accion.texto}</span>
									{/each}
								</span>
							</li>
						{/each}
					</ul>
				</Tarjeta>
			</div>
		</div>
	{/if}
</div>

<style>
	.perfil {
		grid-template-columns: 340px minmax(0, 1fr);
		align-items: start;
	}
	.tarjeta-perfil {
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 0 22px 22px;
	}
	.portada {
		height: 96px;
		margin: 0 -22px;
		background:
			radial-gradient(240px 120px at 80% 0%, rgba(255, 255, 255, 0.35), transparent 70%),
			linear-gradient(135deg, var(--naranja-2), var(--naranja));
	}
	.identidad {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 6px;
		margin-top: -46px;
	}
	.identidad h2 {
		margin-top: 6px;
		font-size: 20px;
		font-weight: 800;
		letter-spacing: -0.02em;
	}
	.rol {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-top: 6px;
		padding: 5px 12px;
		border-radius: 999px;
		font-size: 12.5px;
		font-weight: 700;
		color: var(--naranja);
		background: var(--naranja-suave);
	}
	.rol .material-symbols-rounded {
		font-size: 16px;
	}
	.lista strong {
		text-align: right;
	}
	.formularios {
		display: flex;
		flex-direction: column;
		gap: 20px;
		min-width: 0;
	}
	.formulario {
		gap: 16px;
	}
	form.formulario:not(.rejilla) {
		display: flex;
		flex-direction: column;
	}
	.ancho {
		grid-column: 1 / -1;
	}
	.guardar {
		display: flex;
		align-items: flex-end;
		justify-content: flex-end;
		gap: 8px;
	}
	.entrada:disabled {
		color: var(--texto-3);
		background: rgba(255, 255, 255, 0.4);
	}
	.vacio-perfil {
		padding: 28px;
		text-align: center;
		color: var(--texto-2);
	}
	.permisos li {
		flex-wrap: wrap;
		gap: 8px;
	}
	.modulo {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-weight: 600;
		color: var(--texto);
		text-decoration: none;
	}
	.modulo:hover {
		color: var(--naranja);
	}
	.modulo .material-symbols-rounded {
		font-size: 19px;
		color: var(--naranja);
	}
	.acciones {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	.permiso {
		padding: 3px 9px;
		border-radius: 999px;
		font-size: 11.5px;
		font-weight: 700;
		color: var(--texto-3);
		background: rgba(24, 32, 47, 0.06);
		text-decoration: line-through;
	}
	.permiso.si {
		color: var(--verde);
		background: var(--verde-suave);
		text-decoration: none;
	}
	@media (max-width: 1100px) {
		.perfil {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
