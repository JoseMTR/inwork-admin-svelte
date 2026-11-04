<script>
	// ROLES Y PERMISOS: el administrador decide qué puede hacer cada rol en cada módulo.
	// Cada interruptor es un campo de la tabla rol_modulo (puede_crear, puede_leer, puede_editar, puede_eliminar).
	import { onMount } from 'svelte';
	import { PageHeader, Tarjeta, TablaDatos, Modal, Cargando } from '#lib';
	import { api, cargarVarios } from '#lib/api.js';
	import { permiso, modulos as misModulos } from '#lib/stores/sesion.js';
	import { avisar } from '#lib/stores/avisos.js';
	import { infoModulo, ICONOS_ROL } from '#lib/utils/menu.js';
	import * as f from '#lib/utils/formato.js';

	const CAMPOS = ['puede_crear', 'puede_leer', 'puede_editar', 'puede_eliminar'];

	let cargando = $state(true);
	let d = $state({ roles: [], modulos: [], permisos: [], usuarios: [] });
	let rolElegido = $state(null);
	let filas = $state([]); // una fila por módulo con los 4 permisos (copia editable)
	let guardando = $state(false);

	let modalRol = $state(false);
	let editandoRol = $state(null);
	let formRol = $state({ nombre: '', descripcion: '' });
	let errorRol = $state('');

	let puedeEditar = $derived($permiso('roles', 'editar'));

	async function cargar() {
		const { datos } = await cargarVarios({
			roles: api.get('/roles/'),
			modulos: api.get('/modulos/'),
			permisos: api.get('/rol-modulo/'),
			usuarios: $permiso('usuarios') ? api.get('/usuarios/') : []
		});
		d = datos;
		cargando = false;
		elegirRol(d.roles.find((r) => r.id_rol === rolElegido?.id_rol) ?? d.roles.find((r) => r.id_rol === 2) ?? d.roles[0]);
	}

	onMount(cargar);

	function elegirRol(rol) {
		rolElegido = rol;
		filas = d.modulos.map((m) => {
			const actual = d.permisos.find((p) => p.id_rol === rol.id_rol && p.id_modulo === m.id_modulo);
			return {
				id_modulo: m.id_modulo,
				nombre: m.nombre,
				descripcion: m.descripcion,
				ruta: m.ruta,
				id_rol_modulo: actual?.id_rol_modulo ?? null,
				original: Object.fromEntries(CAMPOS.map((c) => [c, !!actual?.[c]])),
				...Object.fromEntries(CAMPOS.map((c) => [c, !!actual?.[c]]))
			};
		});
	}

	let cambios = $derived(filas.filter((f) => CAMPOS.some((c) => f[c] !== f.original[c])));
	let esAdmin = $derived(rolElegido?.id_rol === 1);

	const interruptor = (fila, campo) =>
		`<button type="button" class="interruptor-boton${fila[campo] !== fila.original[campo] ? ' cambiado' : ''}" data-clic="${campo}" aria-pressed="${fila[campo]}" aria-label="${campo.replace('puede_', '')} en ${fila.nombre}"${!puedeEditar || esAdmin ? ' disabled' : ''}></button>`;

	const columnas = [
		{
			titulo: 'Módulo',
			valor: (fila) => infoModulo(fila).texto,
			html: (fila) => `<strong class="bloque-texto">${f.escapar(infoModulo(fila).texto)}</strong><small class="texto-3">${f.escapar(fila.ruta ?? '')}</small>`
		},
		{ titulo: 'Crear', valor: (fila) => (fila.puede_crear ? 1 : 0), html: (fila) => interruptor(fila, 'puede_crear'), clase: 'centro' },
		{ titulo: 'Leer', valor: (fila) => (fila.puede_leer ? 1 : 0), html: (fila) => interruptor(fila, 'puede_leer'), clase: 'centro' },
		{ titulo: 'Editar', valor: (fila) => (fila.puede_editar ? 1 : 0), html: (fila) => interruptor(fila, 'puede_editar'), clase: 'centro' },
		{ titulo: 'Eliminar', valor: (fila) => (fila.puede_eliminar ? 1 : 0), html: (fila) => interruptor(fila, 'puede_eliminar'), clase: 'centro' }
	];

	function alternar(fila, campo) {
		if (!puedeEditar || esAdmin) return;
		filas = filas.map((x) => {
			if (x.id_modulo !== fila.id_modulo) return x;
			const nueva = { ...x, [campo]: !x[campo] };
			// Sin leer no tiene sentido crear, editar ni eliminar
			if (campo === 'puede_leer' && !nueva.puede_leer) {
				nueva.puede_crear = nueva.puede_editar = nueva.puede_eliminar = false;
			}
			if (campo !== 'puede_leer' && nueva[campo]) nueva.puede_leer = true;
			return nueva;
		});
	}

	async function guardar() {
		guardando = true;
		try {
			for (const fila of cambios) {
				const cuerpo = { id_rol: rolElegido.id_rol, id_modulo: fila.id_modulo, ...Object.fromEntries(CAMPOS.map((c) => [c, fila[c]])) };
				if (fila.id_rol_modulo) await api.put(`/rol-modulo/${fila.id_rol_modulo}`, cuerpo);
				else await api.post('/rol-modulo/', cuerpo);
			}
			avisar(`Permisos de ${rolElegido.nombre} guardados. Sus usuarios verán el menú nuevo al recargar.`);
			misModulos.set(await api.get('/auth/mis-modulos'));
			await cargar();
		} catch (e) {
			avisar(e.message, 'error');
		} finally {
			guardando = false;
		}
	}

	// Vista previa del menú con la configuración actual
	let menu = $derived(
		filas.map((fila) => ({
			texto: infoModulo(fila).texto,
			acceso: !fila.puede_leer ? 'ninguno' : fila.puede_crear || fila.puede_editar || fila.puede_eliminar ? 'completo' : 'lectura'
		}))
	);

	const usuariosDe = (rol) => d.usuarios.filter((u) => u.id_rol === rol.id_rol).length;

	function abrirRol(rol = null) {
		editandoRol = rol;
		formRol = { nombre: rol?.nombre ?? '', descripcion: rol?.descripcion ?? '' };
		errorRol = '';
		modalRol = true;
	}

	async function guardarRol(evento) {
		evento.preventDefault();
		if (!formRol.nombre.trim()) {
			errorRol = 'Escribe el nombre del rol.';
			return;
		}
		try {
			if (editandoRol) await api.put(`/roles/${editandoRol.id_rol}`, { nombre: formRol.nombre.trim(), descripcion: formRol.descripcion.trim() || null });
			else await api.post('/roles/', { nombre: formRol.nombre.trim(), descripcion: formRol.descripcion.trim() || null });
			avisar(editandoRol ? 'Rol actualizado' : 'Rol creado. Ahora dale permisos.');
			modalRol = false;
			await cargar();
		} catch (e) {
			errorRol = e.message;
		}
	}
</script>

<svelte:head>
	<title>Roles y permisos | InWork</title>
</svelte:head>

<div class="pagina">
	<PageHeader titulo="Roles y permisos" grupo="Sistema" descripcion="Decide qué puede hacer cada rol en cada módulo. El menú de cada persona se arma con esta tabla.">
		{#if puedeEditar}
			<button class="boton boton-claro" type="button" onclick={() => elegirRol(rolElegido)} disabled={cambios.length === 0}>Descartar</button>
			<button class="boton boton-primario" type="button" onclick={guardar} disabled={cambios.length === 0 || guardando}>
				<span class="material-symbols-rounded">save</span>
				{guardando ? 'Guardando...' : cambios.length ? `Guardar ${cambios.length} cambio${cambios.length === 1 ? '' : 's'}` : 'Guardar cambios'}
			</button>
		{/if}
	</PageHeader>

	{#if cargando}
		<div class="vidrio"><Cargando texto="Cargando roles" /></div>
	{:else}
		<div class="rejilla roles">
			{#each d.roles as rol (rol.id_rol)}
				<button type="button" class="rol vidrio" class:elegido={rol.id_rol === rolElegido?.id_rol} onclick={() => elegirRol(rol)} disabled={cambios.length > 0 && rol.id_rol !== rolElegido?.id_rol} title={cambios.length > 0 ? 'Guarda o descarta los cambios primero' : ''}>
					<span class="rol-icono">
						<span class="material-symbols-rounded">{ICONOS_ROL[rol.id_rol] ?? 'badge'}</span>
					</span>
					<span class="rol-texto">
						<strong>{rol.nombre}</strong>
						<small>{rol.descripcion ?? ''}</small>
					</span>
					<span class="usuarios">
						<strong>{usuariosDe(rol)}</strong>
						usuarios
					</span>
				</button>
			{/each}
			{#if $permiso('roles', 'crear')}
				<button type="button" class="rol vidrio nuevo" onclick={() => abrirRol()}>
					<span class="rol-icono"><span class="material-symbols-rounded">add</span></span>
					<span class="rol-texto"><strong>Nuevo rol</strong><small>Crea un rol y dale permisos</small></span>
				</button>
			{/if}
		</div>

		<div class="rejilla c-lateral">
			<Tarjeta titulo="Permisos de {rolElegido?.nombre}" subtitulo={esAdmin ? 'El administrador siempre tiene acceso total a todo' : 'Cada interruptor corresponde a una acción sobre el módulo'}>
				{#snippet acciones()}
					{#if puedeEditar && rolElegido}
						<button class="boton boton-claro boton-pequeno" type="button" onclick={() => abrirRol(rolElegido)}>
							<span class="material-symbols-rounded">edit</span>
							Editar rol
						</button>
					{/if}
				{/snippet}
				<TablaDatos datos={filas} {columnas} alClicElemento={alternar} porPagina={25} />
			</Tarjeta>

			<Tarjeta titulo="Lo que verá este rol" subtitulo="Menú con la configuración actual">
				<ul class="lista">
					{#each menu as item, i (i)}
						<li class="acceso-{item.acceso}">
							<span class="item-menu">
								<span class="material-symbols-rounded">{item.acceso === 'ninguno' ? 'visibility_off' : 'visibility'}</span>
								{item.texto}
							</span>
							<small>{item.acceso === 'lectura' ? 'Solo lectura' : item.acceso === 'ninguno' ? 'Sin acceso' : 'Completo'}</small>
						</li>
					{/each}
				</ul>
			</Tarjeta>
		</div>
	{/if}
</div>

<Modal bind:abierto={modalRol} titulo={editandoRol ? 'Editar rol' : 'Nuevo rol'} ancho="460px">
	<form id="form-rol" class="campos" onsubmit={guardarRol} novalidate>
		<div class="campo"><label for="rol-nombre">Nombre</label><input id="rol-nombre" class="entrada" bind:value={formRol.nombre} placeholder="Ej: Soporte" /></div>
		<div class="campo"><label for="rol-desc">Descripción</label><textarea id="rol-desc" class="entrada" bind:value={formRol.descripcion}></textarea></div>
		{#if errorRol}
			<p class="error-campo"><span class="material-symbols-rounded">error</span>{errorRol}</p>
		{/if}
	</form>
	{#snippet pie()}
		<button class="boton boton-claro" type="button" onclick={() => (modalRol = false)}>Cancelar</button>
		<button class="boton boton-primario" type="submit" form="form-rol">Guardar</button>
	{/snippet}
</Modal>

<style>
	.roles {
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	}
	.rol {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 16px 18px;
		text-align: left;
		cursor: pointer;
	}
	.rol:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}
	.rol.elegido {
		border-color: rgba(242, 84, 27, 0.45);
		box-shadow: var(--sombra), 0 0 0 3px var(--naranja-suave);
	}
	.rol.nuevo {
		border-style: dashed;
	}
	.rol-icono {
		display: grid;
		place-items: center;
		width: 46px;
		height: 46px;
		border-radius: 14px;
		color: var(--texto-2);
		background: rgba(255, 255, 255, 0.8);
		border: 1px solid var(--linea);
		flex-shrink: 0;
	}
	.rol.elegido .rol-icono {
		color: #fff;
		border-color: transparent;
		background: linear-gradient(135deg, var(--naranja-2), var(--naranja));
	}
	.rol-texto {
		flex: 1;
		min-width: 0;
	}
	.rol-texto strong {
		display: block;
		font-size: 15px;
		font-weight: 700;
	}
	.rol-texto small {
		display: block;
		font-size: 12px;
		color: var(--texto-3);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.usuarios {
		font-size: 12px;
		color: var(--texto-3);
		text-align: right;
	}
	.usuarios strong {
		display: block;
		font-size: 20px;
		color: var(--texto);
	}
	:global(table.dataTable.tabla td.centro),
	:global(table.dataTable.tabla th.centro) {
		text-align: center;
	}
	.item-menu {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-weight: 600;
	}
	.item-menu .material-symbols-rounded {
		font-size: 18px;
		color: var(--verde);
	}
	.lista small {
		font-size: 12px;
		color: var(--texto-3);
	}
	.acceso-lectura .item-menu .material-symbols-rounded {
		color: var(--azul);
	}
	.acceso-ninguno {
		opacity: 0.5;
	}
	.acceso-ninguno .item-menu .material-symbols-rounded {
		color: var(--texto-3);
	}
	.campos {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
</style>
