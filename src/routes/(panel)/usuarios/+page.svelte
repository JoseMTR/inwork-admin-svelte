<script>
	// USUARIOS: todas las personas de InWork. El administrador crea, edita, cambia el rol,
	// restablece la contraseña y desactiva cuentas. Moderador y analista solo pueden ver.
	import { onMount } from 'svelte';
	import { PageHeader, StatCard, Tarjeta, TablaDatos, Avatar, StatusPill, GraficoBarras, Modal, Confirmar, Cargando, EmptyState } from '#lib';
	import { api, cargarVarios } from '#lib/api.js';
	import { sesion, permiso } from '#lib/stores/sesion.js';
	import { avisar } from '#lib/stores/avisos.js';
	import * as f from '#lib/utils/formato.js';
	import * as h from '#lib/utils/html.js';

	const ROLES = [
		{ id_rol: 1, nombre: 'Administrador' },
		{ id_rol: 2, nombre: 'Moderador' },
		{ id_rol: 3, nombre: 'Analista' },
		{ id_rol: 4, nombre: 'Empleador' },
		{ id_rol: 5, nombre: 'Empleado' }
	];
	const TIPOS_DOCUMENTO = ['cedula', 'pasaporte', 'permiso de residencia', 'cedula de extranjeria'];

	let cargando = $state(true);
	let error = $state('');
	let d = $state({ usuarios: [] });
	let seleccionado = $state(null);
	let pestana = $state('Resumen');
	const pestanas = ['Resumen', 'Trabajos', 'Contrataciones', 'Ofertas', 'Calificaciones'];

	let puedeCrear = $derived($permiso('usuarios', 'crear') && $sesion?.id_rol === 1);
	let esAdmin = $derived($sesion?.id_rol === 1);

	async function cargar(silencioso = false) {
		if (!silencioso) cargando = true;
		error = '';
		try {
			const { datos } = await cargarVarios({
				usuarios: api.get('/usuarios/'),
				ciudades: $permiso('ubicacion') ? api.get('/ciudades/') : [],
				habilidades: $permiso('categorias') ? api.get('/habilidades/') : [],
				usuariosHabilidades: api.get('/usuarios-habilidades/'),
				trabajos: $permiso('trabajos') ? api.get('/trabajos/') : [],
				ofertas: $permiso('ofertas') ? api.get('/ofertas/') : [],
				contrataciones: $permiso('contrataciones') ? api.get('/contrataciones/') : [],
				calificaciones: $permiso('calificaciones') ? api.get('/calificaciones/') : []
			});
			if (!datos.usuarios.length) throw new Error('No se pudo leer la lista de usuarios.');
			d = datos;
			seleccionado = seleccionado ? (d.usuarios.find((u) => u.id_usuario === seleccionado.id_usuario) ?? d.usuarios[0]) : d.usuarios[0];
		} catch (e) {
			error = e.message;
		} finally {
			cargando = false;
		}
	}

	onMount(() => cargar());

	let usuariosPorId = $derived(f.mapaPor(d.usuarios, 'id_usuario'));
	let trabajosPorId = $derived(f.mapaPor(d.trabajos, 'id_trabajo'));
	let habilidadesPorId = $derived(f.mapaPor(d.habilidades, 'id_habilidad'));
	const nombre = (id) => f.nombreCompleto(usuariosPorId.get(id));

	const trabajosDe = (id) => (d.trabajos ?? []).filter((t) => t.id_cliente === id);
	const contratosDe = (id) => (d.contrataciones ?? []).filter((c) => c.id_cliente === id || c.id_trabajador === id);
	const ofertasDe = (id) => (d.ofertas ?? []).filter((o) => o.id_trabajador === id);

	let resumen = $derived([
		{ titulo: 'Total de usuarios', valor: f.numero(d.usuarios.length), icono: 'group', color: 'azul', detalle: 'cuentas activas' },
		{ titulo: 'Empleadores', valor: f.numero(d.usuarios.filter((u) => u.id_rol === 4).length), icono: 'storefront', color: 'naranja', detalle: 'publican trabajos' },
		{ titulo: 'Empleados', valor: f.numero(d.usuarios.filter((u) => u.id_rol === 5).length), icono: 'construction', color: 'verde', detalle: 'hacen trabajos' },
		{ titulo: 'Equipo InWork', valor: f.numero(d.usuarios.filter((u) => u.id_rol <= 3).length), icono: 'admin_panel_settings', color: 'morado', detalle: 'admin, moderación y análisis' }
	]);

	const columnas = [
		{ titulo: 'Usuario', valor: (u) => `${f.nombreCompleto(u)} ${u.correo}`, html: (u) => h.persona(f.nombreCompleto(u), u.correo, 'normal') },
		{
			titulo: 'Documento',
			valor: (u) => u.numero_identificacion,
			html: (u) => `<span class="numero">${f.escapar(u.numero_identificacion)}</span><small class="bajo">${f.escapar(f.capitalizar(u.tipo_identificacion))}</small>`
		},
		{ titulo: 'Ciudad', valor: (u) => u.ciudad ?? 'Sin ciudad' },
		{ titulo: 'Rol', valor: (u) => u.rol, html: (u) => h.chip(u.rol) },
		{ titulo: 'Trabajos', valor: (u) => trabajosDe(u.id_usuario).length, clase: 'numero' },
		{ titulo: 'Contratos', valor: (u) => contratosDe(u.id_usuario).length, clase: 'numero' },
		{ titulo: 'Calificación', valor: (u) => Number(u.promedio_calificacion), html: (u) => h.notaEstrella(u.promedio_calificacion) },
		{
			titulo: 'Correo',
			valor: (u) => (u.correo_verificado ? 'Verificado' : 'Sin verificar'),
			html: (u) =>
				`<span class="verificado ${u.correo_verificado ? 'si' : 'no'}"><span class="material-symbols-rounded">${u.correo_verificado ? 'verified' : 'error'}</span>${u.correo_verificado ? 'Verificado' : 'Sin verificar'}</span>`
		}
	];

	let acciones = $derived(
		esAdmin
			? [
					{ texto: 'Editar', icono: 'edit', soloIcono: true, alHacer: abrirEditar },
					{ texto: 'Cambiar rol', icono: 'manage_accounts', soloIcono: true, mostrar: (u) => u.id_usuario !== $sesion.id_usuario, alHacer: abrirRol },
					{ texto: 'Restablecer contraseña', icono: 'key', soloIcono: true, alHacer: abrirClave },
					{ texto: 'Desactivar', icono: 'block', tono: 'peligro', soloIcono: true, mostrar: (u) => u.id_usuario !== $sesion.id_usuario, alHacer: abrirDesactivar }
				]
			: []
	);

	let porRol = $derived(f.contarPor(d.usuarios, (u) => u.rol));
	let porCiudad = $derived(f.contarPor(d.usuarios, (u) => u.ciudad).slice(0, 6));

	// Detalle del usuario elegido
	let habilidadesSel = $derived(
		seleccionado
			? (d.usuariosHabilidades ?? [])
					.filter((x) => x.id_usuario === seleccionado.id_usuario)
					.map((x) => ({ nombre: habilidadesPorId.get(x.id_habilidad)?.nombre ?? 'Habilidad', anios: x.anios_experiencia }))
			: []
	);
	let trabajosSel = $derived(seleccionado ? trabajosDe(seleccionado.id_usuario) : []);
	let contratosSel = $derived(seleccionado ? contratosDe(seleccionado.id_usuario) : []);
	let ofertasSel = $derived(seleccionado ? ofertasDe(seleccionado.id_usuario) : []);
	let calificacionesSel = $derived(seleccionado ? (d.calificaciones ?? []).filter((c) => c.id_calificado === seleccionado.id_usuario) : []);
	let actividadSel = $derived.by(() => {
		if (!seleccionado) return [];
		const id = seleccionado.id_usuario;
		const eventos = [
			...trabajosSel.map((t) => ({ titulo: `Publicó «${t.titulo}»`, fecha: t.created })),
			...ofertasSel.map((o) => ({ titulo: `Ofertó en «${trabajosPorId.get(o.id_trabajo)?.titulo ?? 'un trabajo'}»`, fecha: o.fecha_oferta })),
			...contratosSel.map((c) => ({
				titulo: c.id_cliente === id ? `Contrató a ${nombre(c.id_trabajador)}` : `Lo contrató ${nombre(c.id_cliente)}`,
				fecha: c.fecha_contratacion
			})),
			...calificacionesSel.map((c) => ({ titulo: `Recibió ${c.puntuacion} estrellas de ${nombre(c.id_calificador)}`, fecha: c.created }))
		];
		return eventos.sort((a, b) => f.ordenFecha(b.fecha) - f.ordenFecha(a.fecha)).slice(0, 5);
	});

	function elegir(fila) {
		seleccionado = d.usuarios.find((u) => u.id_usuario === fila.id_usuario) ?? fila;
		pestana = 'Resumen';
	}

	// ----- Formularios -----
	let modal = $state(''); // 'nuevo' | 'editar' | 'rol' | 'clave'
	let abiertoModal = $state(false);
	let confirmarAbierto = $state(false);
	let objetivo = $state(null);
	let form = $state({});
	let guardando = $state(false);
	let errorForm = $state('');

	function abrir(tipo, usuario, valores) {
		modal = tipo;
		objetivo = usuario;
		form = valores;
		errorForm = '';
		abiertoModal = true;
	}

	function abrirNuevo() {
		abrir('nuevo', null, {
			nombre: '',
			apellido: '',
			correo: '',
			password: '',
			telefono: '',
			tipo_identificacion: 'cedula',
			numero_identificacion: '',
			fecha_nacimiento: '',
			id_ciudad: d.ciudades?.[0]?.id_ciudad ?? null,
			id_rol: 2,
			direccion: '',
			descripcion: ''
		});
	}

	function abrirEditar(u) {
		abrir('editar', u, {
			nombre: u.nombre,
			apellido: u.apellido,
			telefono: u.telefono,
			id_ciudad: u.id_ciudad,
			direccion: u.direccion ?? '',
			descripcion: u.descripcion ?? '',
			foto_perfil: u.foto_perfil
		});
	}

	function abrirRol(u) {
		abrir('rol', u, { id_rol: u.id_rol });
	}

	function abrirClave(u) {
		abrir('clave', u, { password_nueva: '', confirmar: '' });
	}

	function abrirDesactivar(u) {
		objetivo = u;
		confirmarAbierto = true;
	}

	function edad(fechaTexto) {
		const nacimiento = f.aFecha(fechaTexto);
		if (!nacimiento) return 0;
		const hoy = new Date();
		let anios = hoy.getFullYear() - nacimiento.getFullYear();
		if (hoy < new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate())) anios--;
		return anios;
	}

	function validar() {
		if (modal === 'nuevo' || modal === 'editar') {
			if (!form.nombre?.trim() || !form.apellido?.trim()) return 'Escribe el nombre y el apellido.';
			if (!/^3\d{9}$/.test(String(form.telefono).replace(/\s/g, ''))) return 'El teléfono debe ser un celular colombiano de 10 dígitos (empieza por 3).';
		}
		if (modal === 'nuevo') {
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.correo)) return 'Escribe un correo válido.';
			if (form.password.length < 8) return 'La contraseña debe tener mínimo 8 caracteres.';
			if (!form.numero_identificacion.trim()) return 'Escribe el número de documento.';
			if (edad(form.fecha_nacimiento) < 18) return 'La persona debe ser mayor de 18 años.';
		}
		if (modal === 'clave') {
			if (form.password_nueva.length < 8) return 'La contraseña debe tener mínimo 8 caracteres.';
			if (form.password_nueva !== form.confirmar) return 'Las contraseñas no coinciden.';
		}
		return '';
	}

	async function guardar(evento) {
		evento.preventDefault();
		errorForm = validar();
		if (errorForm) return;
		guardando = true;
		try {
			if (modal === 'nuevo') {
				await api.post('/usuarios/', {
					...form,
					correo: form.correo.trim().toLowerCase(),
					telefono: form.telefono.replace(/\s/g, ''),
					id_rol: Number(form.id_rol),
					id_ciudad: form.id_ciudad ? Number(form.id_ciudad) : null
				});
				avisar(`Se creó la cuenta de ${form.nombre} ${form.apellido}`);
			} else if (modal === 'editar') {
				await api.put(`/usuarios/${objetivo.id_usuario}`, {
					...form,
					telefono: form.telefono.replace(/\s/g, ''),
					id_ciudad: form.id_ciudad ? Number(form.id_ciudad) : null
				});
				avisar('Datos actualizados');
			} else if (modal === 'rol') {
				await api.put(`/usuarios/${objetivo.id_usuario}/rol`, { id_rol: Number(form.id_rol) });
				avisar(`${f.nombreCompleto(objetivo)} ahora es ${ROLES.find((r) => r.id_rol === Number(form.id_rol))?.nombre}`);
			} else if (modal === 'clave') {
				await api.put(`/usuarios/${objetivo.id_usuario}/password`, { password_nueva: form.password_nueva });
				avisar(`Contraseña restablecida para ${f.nombreCompleto(objetivo)}`);
			}
			abiertoModal = false;
			await cargar(true);
		} catch (e) {
			errorForm = e.message;
		} finally {
			guardando = false;
		}
	}

	async function desactivar() {
		await api.del(`/usuarios/${objetivo.id_usuario}`);
		avisar(`La cuenta de ${f.nombreCompleto(objetivo)} quedó desactivada`);
		if (seleccionado?.id_usuario === objetivo.id_usuario) seleccionado = null;
		await cargar(true);
	}

	function exportar() {
		f.descargarCSV('usuarios-inwork.csv', [
			{ titulo: 'Nombre', valor: (u) => f.nombreCompleto(u) },
			{ titulo: 'Correo', valor: (u) => u.correo },
			{ titulo: 'Teléfono', valor: (u) => u.telefono },
			{ titulo: 'Documento', valor: (u) => `${u.tipo_identificacion} ${u.numero_identificacion}` },
			{ titulo: 'Ciudad', valor: (u) => u.ciudad },
			{ titulo: 'Rol', valor: (u) => u.rol },
			{ titulo: 'Calificación', valor: (u) => u.promedio_calificacion }
		], d.usuarios);
	}

	const titulosModal = { nuevo: 'Nuevo usuario', editar: 'Editar usuario', rol: 'Cambiar rol', clave: 'Restablecer contraseña' };
</script>

<svelte:head>
	<title>Usuarios | InWork</title>
</svelte:head>

<div class="pagina">
	<PageHeader titulo="Usuarios" grupo="Personas" descripcion="Todas las personas registradas en InWork. Elige una para ver toda su actividad.">
		<button class="boton boton-claro" type="button" onclick={exportar} disabled={cargando}>
			<span class="material-symbols-rounded">download</span>
			Exportar
		</button>
		{#if puedeCrear}
			<button class="boton boton-primario" type="button" onclick={abrirNuevo}>
				<span class="material-symbols-rounded">person_add</span>
				Nuevo usuario
			</button>
		{:else}
			<span class="solo-lectura"><span class="material-symbols-rounded">visibility</span>Solo lectura</span>
		{/if}
	</PageHeader>

	{#if cargando}
		<div class="vidrio"><Cargando texto="Cargando usuarios" /></div>
	{:else if error}
		<div class="vidrio">
			<EmptyState icono="cloud_off" titulo="No se pudieron cargar los usuarios" texto={error}>
				<button class="boton boton-primario" type="button" onclick={() => cargar()}>Reintentar</button>
			</EmptyState>
		</div>
	{:else}
		<div class="rejilla c-4">
			{#each resumen as dato (dato.titulo)}
				<StatCard {dato} />
			{/each}
		</div>

		<Tarjeta titulo="Listado de usuarios" subtitulo="{d.usuarios.length} cuentas activas. Haz clic en una fila para ver el detalle.">
			<TablaDatos datos={d.usuarios} {columnas} {acciones} alSeleccionar={elegir} {seleccionado} clave="id_usuario" />
		</Tarjeta>

		{#if seleccionado}
			<section class="detalle-usuario vidrio">
				<header class="perfil">
					<Avatar nombre={f.nombreCompleto(seleccionado)} tamano="grande" />
					<div class="perfil-texto">
						<div class="perfil-nombre">
							<h2>{f.nombreCompleto(seleccionado)}</h2>
							<StatusPill estado={seleccionado.estado ? 'activo' : 'inactivo'} />
						</div>
						<span class="texto-2">{seleccionado.correo}, {seleccionado.rol} desde {f.fecha(seleccionado.created)}</span>
					</div>
					<div class="acciones">
						{#if $permiso('reportes')}
							<a class="boton boton-claro" href="/reportes">
								<span class="material-symbols-rounded">flag</span>
								Ver reportes
							</a>
						{/if}
						{#if esAdmin}
							<button class="boton boton-claro" type="button" onclick={() => abrirEditar(seleccionado)}>
								<span class="material-symbols-rounded">edit</span>
								Editar
							</button>
							{#if seleccionado.id_usuario !== $sesion.id_usuario}
								<button class="boton boton-claro" type="button" onclick={() => abrirRol(seleccionado)}>
									<span class="material-symbols-rounded">manage_accounts</span>
									Cambiar rol
								</button>
								<button class="boton boton-peligro" type="button" onclick={() => abrirDesactivar(seleccionado)}>
									<span class="material-symbols-rounded">block</span>
									Desactivar
								</button>
							{/if}
						{/if}
					</div>
				</header>

				<div class="segmentado pestanas">
					{#each pestanas as opcion (opcion)}
						<button type="button" class="segmento" class:activo={opcion === pestana} onclick={() => (pestana = opcion)}>{opcion}</button>
					{/each}
				</div>

				{#if pestana === 'Resumen'}
					<div class="cuerpo">
						<div class="bloque">
							<span class="subtitulo-seccion">Datos personales</span>
							<dl class="detalle">
								<div><dt>Teléfono</dt><dd>{seleccionado.telefono}</dd></div>
								<div><dt>Ciudad</dt><dd>{seleccionado.ciudad ?? 'Sin ciudad'}</dd></div>
								<div><dt>Dirección</dt><dd>{seleccionado.direccion || 'Sin dirección'}</dd></div>
								<div><dt>Nacimiento</dt><dd>{f.fecha(seleccionado.fecha_nacimiento)}</dd></div>
								<div><dt>Documento</dt><dd>{f.capitalizar(seleccionado.tipo_identificacion)} {seleccionado.numero_identificacion}</dd></div>
								<div><dt>Registro</dt><dd>{f.fecha(seleccionado.created)}</dd></div>
							</dl>
						</div>

						<div class="bloque">
							<span class="subtitulo-seccion">Habilidades</span>
							{#if habilidadesSel.length}
								<div class="fila-chips">
									{#each habilidadesSel as habilidad, i (i)}
										<span class="chip">{habilidad.nombre} <small>{habilidad.anios} años</small></span>
									{/each}
								</div>
							{:else}
								<p class="texto-3 texto-chico">No tiene habilidades registradas.</p>
							{/if}
							<div class="totales">
								<div class="dato-mini"><span>Trabajos</span><strong>{trabajosSel.length}</strong></div>
								<div class="dato-mini"><span>Contratos</span><strong>{contratosSel.length}</strong></div>
								<div class="dato-mini"><span>Ofertas</span><strong>{ofertasSel.length}</strong></div>
							</div>
						</div>

						<div class="bloque">
							<span class="subtitulo-seccion">Actividad</span>
							{#if actividadSel.length}
								<ul class="linea-tiempo">
									{#each actividadSel as evento, i (i)}
										<li class={i === 0 ? 'actual' : 'hecho'}>
											<strong>{evento.titulo}</strong>
											<small>{f.fechaHora(evento.fecha)}</small>
										</li>
									{/each}
								</ul>
							{:else}
								<p class="texto-3 texto-chico">Sin movimientos todavía.</p>
							{/if}
						</div>
					</div>
				{:else}
					{@const lista =
						pestana === 'Trabajos'
							? trabajosSel.map((t) => ({ titulo: t.titulo, detalle: `${f.fecha(t.fecha_trabajo)} · ${f.moneda(t.presupuesto)}`, estado: t.estado_trabajo }))
							: pestana === 'Contrataciones'
								? contratosSel.map((c) => ({
										titulo: trabajosPorId.get(c.id_trabajo)?.titulo ?? 'Trabajo',
										detalle: c.id_cliente === seleccionado.id_usuario ? `Contrató a ${nombre(c.id_trabajador)}` : `Contratado por ${nombre(c.id_cliente)}`,
										estado: c.estado_contratacion
									}))
								: pestana === 'Ofertas'
									? ofertasSel.map((o) => ({ titulo: trabajosPorId.get(o.id_trabajo)?.titulo ?? 'Trabajo', detalle: f.moneda(o.valor_oferta), estado: o.estado_oferta }))
									: calificacionesSel.map((c) => ({ titulo: `${c.puntuacion} estrellas de ${nombre(c.id_calificador)}`, detalle: c.comentario ?? '', estado: '' }))}
					{#if lista.length === 0}
						<p class="texto-3">No hay {pestana.toLowerCase()} para este usuario.</p>
					{:else}
						<ul class="lista">
							{#each lista as item, i (i)}
								<li>
									<div>
										<strong class="bloque-texto">{item.titulo}</strong>
										<small class="texto-3">{item.detalle}</small>
									</div>
									{#if item.estado}<StatusPill estado={item.estado} />{/if}
								</li>
							{/each}
						</ul>
					{/if}
				{/if}
			</section>
		{/if}

		<div class="rejilla c-2">
			<Tarjeta titulo="Usuarios por rol" subtitulo="Cuántas cuentas hay de cada rol">
				<GraficoBarras barras={porRol} color="azul" />
			</Tarjeta>
			<Tarjeta titulo="Usuarios por ciudad" subtitulo="Las ciudades con más usuarios">
				<GraficoBarras barras={porCiudad} horizontal color="azul" />
			</Tarjeta>
		</div>
	{/if}
</div>

<Modal bind:abierto={abiertoModal} titulo={titulosModal[modal]} subtitulo={objetivo ? f.nombreCompleto(objetivo) : 'La persona podrá iniciar sesión con este correo'} ancho={modal === 'nuevo' || modal === 'editar' ? '720px' : '460px'}>
	<form id="form-usuario" class="formulario" onsubmit={guardar} novalidate>
		{#if modal === 'nuevo' || modal === 'editar'}
			<div class="rejilla c-2">
				<div class="campo"><label for="u-nombre">Nombre</label><input id="u-nombre" class="entrada" bind:value={form.nombre} /></div>
				<div class="campo"><label for="u-apellido">Apellidos</label><input id="u-apellido" class="entrada" bind:value={form.apellido} /></div>
				{#if modal === 'nuevo'}
					<div class="campo"><label for="u-correo">Correo</label><input id="u-correo" class="entrada" type="email" bind:value={form.correo} placeholder="nombre@inwork.com.co" /></div>
					<div class="campo"><label for="u-clave">Contraseña</label><input id="u-clave" class="entrada" type="password" bind:value={form.password} placeholder="Mínimo 8 caracteres" /></div>
					<div class="campo">
						<label for="u-tipo">Tipo de documento</label>
						<select id="u-tipo" class="entrada" bind:value={form.tipo_identificacion}>
							{#each TIPOS_DOCUMENTO as tipo (tipo)}<option value={tipo}>{f.capitalizar(tipo)}</option>{/each}
						</select>
					</div>
					<div class="campo"><label for="u-doc">Número de documento</label><input id="u-doc" class="entrada" bind:value={form.numero_identificacion} inputmode="numeric" /></div>
					<div class="campo"><label for="u-nac">Fecha de nacimiento</label><input id="u-nac" class="entrada" type="date" bind:value={form.fecha_nacimiento} /></div>
					<div class="campo">
						<label for="u-rol">Rol</label>
						<select id="u-rol" class="entrada" bind:value={form.id_rol}>
							{#each ROLES as rol (rol.id_rol)}<option value={rol.id_rol}>{rol.nombre}</option>{/each}
						</select>
					</div>
				{/if}
				<div class="campo"><label for="u-tel">Teléfono</label><input id="u-tel" class="entrada" bind:value={form.telefono} placeholder="3001234567" inputmode="tel" /></div>
				<div class="campo">
					<label for="u-ciudad">Ciudad</label>
					<select id="u-ciudad" class="entrada" bind:value={form.id_ciudad}>
						<option value={null}>Sin ciudad</option>
						{#each d.ciudades ?? [] as ciudad (ciudad.id_ciudad)}<option value={ciudad.id_ciudad}>{ciudad.nombre}</option>{/each}
					</select>
				</div>
				<div class="campo ancho-total"><label for="u-dir">Dirección</label><input id="u-dir" class="entrada" bind:value={form.direccion} placeholder="Calle 72 #45-10, barrio" /></div>
				<div class="campo ancho-total"><label for="u-desc">Descripción</label><textarea id="u-desc" class="entrada" bind:value={form.descripcion}></textarea></div>
			</div>
		{:else if modal === 'rol'}
			<div class="campo">
				<label for="r-rol">Nuevo rol</label>
				<select id="r-rol" class="entrada" bind:value={form.id_rol}>
					{#each ROLES as rol (rol.id_rol)}<option value={rol.id_rol}>{rol.nombre}</option>{/each}
				</select>
				<span class="ayuda">La persona tendrá que iniciar sesión de nuevo para ver su nuevo menú.</span>
			</div>
		{:else if modal === 'clave'}
			<div class="campo"><label for="c-nueva">Nueva contraseña</label><input id="c-nueva" class="entrada" type="password" bind:value={form.password_nueva} placeholder="Mínimo 8 caracteres" /></div>
			<div class="campo"><label for="c-conf">Confirmar contraseña</label><input id="c-conf" class="entrada" type="password" bind:value={form.confirmar} /></div>
		{/if}
		{#if errorForm}
			<p class="error-campo"><span class="material-symbols-rounded">error</span>{errorForm}</p>
		{/if}
	</form>
	{#snippet pie()}
		<button class="boton boton-claro" type="button" onclick={() => (abiertoModal = false)}>Cancelar</button>
		<button class="boton boton-primario" type="submit" form="form-usuario" disabled={guardando}>
			<span class="material-symbols-rounded">save</span>
			{guardando ? 'Guardando...' : 'Guardar'}
		</button>
	{/snippet}
</Modal>

<Confirmar
	bind:abierto={confirmarAbierto}
	titulo="Desactivar cuenta"
	texto="{objetivo ? f.nombreCompleto(objetivo) : ''} ya no podrá iniciar sesión. Sus trabajos y contratos se conservan."
	textoBoton="Desactivar"
	alConfirmar={desactivar}
/>

<style>
	:global(.verificado) {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 12.5px;
		font-weight: 600;
		white-space: nowrap;
	}
	:global(.verificado .material-symbols-rounded) {
		font-size: 17px;
	}
	:global(.verificado.si) {
		color: var(--verde);
	}
	:global(.verificado.no) {
		color: var(--ambar);
	}
	.detalle-usuario {
		display: flex;
		flex-direction: column;
		gap: 18px;
		padding: 22px;
	}
	.perfil {
		display: flex;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}
	.perfil-texto {
		flex: 1;
		min-width: 220px;
	}
	.perfil-nombre {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}
	.perfil-nombre h2 {
		font-size: 22px;
		font-weight: 800;
		letter-spacing: -0.02em;
	}
	.pestanas {
		align-self: flex-start;
		flex-wrap: wrap;
	}
	.cuerpo {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr);
		gap: 18px;
	}
	.bloque {
		padding: 16px;
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.5);
		border: 1px solid var(--linea);
	}
	.totales {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
		margin-top: 14px;
	}
	.formulario {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.formulario .rejilla {
		gap: 14px;
	}
	@media (max-width: 1100px) {
		.cuerpo {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
