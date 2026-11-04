<script>
	// INICIO (dashboard): resumen de toda la plataforma con datos reales de las dos APIs.
	import { onMount } from 'svelte';
	import { PageHeader, StatCard, Tarjeta, GraficoArea, GraficoDona, GraficoBarras, Avatar, TablaDatos, Cargando, EmptyState } from '#lib';
	import { api, pagosApi, cargarVarios } from '#lib/api.js';
	import { sesion, permiso } from '#lib/stores/sesion.js';
	import * as f from '#lib/utils/formato.js';
	import * as h from '#lib/utils/html.js';

	let cargando = $state(true);
	let d = $state({});
	let serie = $state('Trabajos');
	const series = ['Trabajos', 'Ofertas', 'Contrataciones'];

	async function cargar() {
		cargando = true;
		const puede = (m) => $permiso(m);
		const { datos } = await cargarVarios({
			usuarios: puede('usuarios') ? api.get('/usuarios/') : [],
			trabajos: puede('trabajos') ? api.get('/trabajos/') : [],
			ofertas: puede('ofertas') ? api.get('/ofertas/') : [],
			contrataciones: puede('contrataciones') ? api.get('/contrataciones/') : [],
			categorias: puede('categorias') ? api.get('/categorias/') : [],
			habilidades: puede('categorias') ? api.get('/habilidades/') : [],
			usuariosHabilidades: puede('usuarios') ? api.get('/usuarios-habilidades/') : [],
			calificaciones: puede('calificaciones') ? api.get('/calificaciones/') : [],
			verificaciones: puede('verificaciones') ? api.get('/verificaciones-identidad/') : [],
			reportes: puede('reportes') ? api.get('/reportes/') : [],
			pagos: puede('pagos') ? pagosApi.get('/pagos') : [],
			custodias: puede('pagos') ? pagosApi.get('/custodias') : []
		});
		d = datos;
		cargando = false;
	}

	onMount(cargar);

	let usuariosPorId = $derived(f.mapaPor(d.usuarios, 'id_usuario'));
	let trabajosPorId = $derived(f.mapaPor(d.trabajos, 'id_trabajo'));
	let categoriasPorId = $derived(f.mapaPor(d.categorias, 'id_categoria'));
	const nombre = (id) => f.nombreCompleto(usuariosPorId.get(id));
	const tituloTrabajo = (id) => trabajosPorId.get(id)?.titulo ?? 'Trabajo';

	let contar = (lista = [], campo, valor) => lista.filter((x) => x[campo] === valor).length;

	let metricas = $derived.by(() => {
		const u = d.usuarios ?? [];
		const t = d.trabajos ?? [];
		const c = d.contrataciones ?? [];
		const finalizadas = contar(c, 'estado_contratacion', 'finalizada');
		const lista = [];
		if ($permiso('usuarios'))
			lista.push({
				titulo: 'Usuarios registrados',
				valor: f.numero(u.length),
				icono: 'group',
				color: 'azul',
				detalle: `${contar(u, 'id_rol', 4)} empleadores · ${contar(u, 'id_rol', 5)} empleados`
			});
		if ($permiso('trabajos'))
			lista.push({
				titulo: 'Trabajos publicados',
				valor: f.numero(contar(t, 'estado_trabajo', 'publicado')),
				icono: 'work',
				color: 'naranja',
				detalle: `de ${t.length} trabajos en total`
			});
		if ($permiso('contrataciones'))
			lista.push({
				titulo: 'Contrataciones activas',
				valor: f.numero(contar(c, 'estado_contratacion', 'activa')),
				icono: 'handshake',
				color: 'verde',
				detalle: `${finalizadas} finalizadas`
			});
		if ($permiso('pagos'))
			lista.push({
				titulo: 'Comisión de InWork',
				valor: f.millones(f.sumar((d.pagos ?? []).filter((p) => p.tipo_pago === 'comision'), (p) => p.monto)),
				icono: 'payments',
				color: 'morado',
				detalle: `${contar(d.custodias, 'estado_custodia', 'asegurado')} pagos en custodia`
			});
		if ($permiso('contrataciones'))
			lista.push({
				titulo: 'Tasa de finalización',
				valor: f.porcentaje(finalizadas, c.length, 1),
				icono: 'task_alt',
				color: 'ambar',
				detalle: 'de todas las contrataciones'
			});
		return lista;
	});

	// Gráfico por semana según la serie elegida
	let evolucion = $derived.by(() => {
		const origen = {
			Trabajos: (d.trabajos ?? []).map((t) => t.fecha_trabajo),
			Ofertas: (d.ofertas ?? []).map((o) => o.fecha_oferta),
			Contrataciones: (d.contrataciones ?? []).map((c) => c.fecha_contratacion)
		}[serie];
		const semanas = new Map();
		for (const valor of origen) {
			const lunes = f.inicioSemana(valor);
			if (!lunes) continue;
			const clave = lunes.getTime();
			semanas.set(clave, (semanas.get(clave) || 0) + 1);
		}
		const ordenadas = [...semanas.entries()].sort((a, b) => a[0] - b[0]).slice(-10);
		return {
			valores: ordenadas.map(([, n]) => n),
			etiquetas: ordenadas.map(([clave]) => f.etiquetaSemana(new Date(clave)))
		};
	});

	let trabajosPorEstado = $derived([
		{ nombre: 'Publicados', valor: contar(d.trabajos, 'estado_trabajo', 'publicado'), color: '#f2541b' },
		{ nombre: 'Asignados', valor: contar(d.trabajos, 'estado_trabajo', 'asignado'), color: '#2f7cf6' },
		{ nombre: 'Finalizados', valor: contar(d.trabajos, 'estado_trabajo', 'finalizado'), color: '#12a067' },
		{ nombre: 'Cancelados', valor: contar(d.trabajos, 'estado_trabajo', 'cancelado'), color: '#b6bcc8' }
	]);

	let categorias = $derived(f.contarPor(d.trabajos, (t) => categoriasPorId.get(t.id_categoria)?.nombre).slice(0, 6));

	let mejores = $derived.by(() => {
		const habilidadesPorId = f.mapaPor(d.habilidades, 'id_habilidad');
		return (d.usuarios ?? [])
			.filter((u) => u.id_rol === 5 && Number(u.total_calificaciones) > 0)
			.sort((a, b) => Number(b.promedio_calificacion) - Number(a.promedio_calificacion) || b.total_calificaciones - a.total_calificaciones)
			.slice(0, 5)
			.map((u) => {
				const habilidad = (d.usuariosHabilidades ?? []).find((x) => x.id_usuario === u.id_usuario);
				return {
					nombre: f.nombreCompleto(u),
					oficio: habilidadesPorId.get(habilidad?.id_habilidad)?.nombre ?? 'Sin oficio registrado',
					trabajos: (d.contrataciones ?? []).filter((c) => c.id_trabajador === u.id_usuario && c.estado_contratacion === 'finalizada').length,
					calificacion: Number(u.promedio_calificacion).toFixed(1)
				};
			});
	});

	let alertas = $derived.by(() => {
		const lista = [];
		const pendientesVerif = contar(d.verificaciones, 'estado_verificacion', 'pendiente');
		const pendientesRep = contar(d.reportes, 'estado_reporte', 'pendiente');
		const disputas = contar(d.custodias, 'estado_custodia', 'en_disputa');
		const sinPagar = contar(d.custodias, 'estado_custodia', 'pendiente_pago');
		if ($permiso('verificaciones') && pendientesVerif)
			lista.push({ icono: 'badge', titulo: `${pendientesVerif} verificaciones pendientes`, detalle: 'Documentos esperando revisión', ruta: '/verificaciones', tono: 'ambar' });
		if ($permiso('reportes') && pendientesRep)
			lista.push({ icono: 'flag', titulo: `${pendientesRep} reportes sin atender`, detalle: 'Denuncias entre usuarios', ruta: '/reportes', tono: 'rojo' });
		if ($permiso('pagos') && disputas)
			lista.push({ icono: 'gavel', titulo: `${disputas} pagos en disputa`, detalle: 'InWork debe decidir a quién pagar', ruta: '/pagos', tono: 'morado' });
		if ($permiso('pagos') && sinPagar)
			lista.push({ icono: 'hourglass_top', titulo: `${f.cantidad(sinPagar, 'contrato')} sin pagar`, detalle: 'El cliente aún no deposita', ruta: '/pagos', tono: 'ambar' });
		return lista;
	});

	// Actividad reciente armada con los movimientos de cada tabla
	let actividad = $derived.by(() => {
		const eventos = [];
		for (const t of d.trabajos ?? [])
			eventos.push({ usuario: nombre(t.id_cliente), accion: `Publicó «${t.titulo}»`, modulo: 'Trabajos', estado: t.estado_trabajo, fecha: t.created });
		for (const o of d.ofertas ?? [])
			eventos.push({ usuario: nombre(o.id_trabajador), accion: `Ofertó ${f.moneda(o.valor_oferta)} en «${tituloTrabajo(o.id_trabajo)}»`, modulo: 'Ofertas', estado: o.estado_oferta, fecha: o.fecha_oferta });
		for (const c of d.contrataciones ?? [])
			eventos.push({ usuario: nombre(c.id_cliente), accion: `Contrató a ${nombre(c.id_trabajador)}`, modulo: 'Contrataciones', estado: c.estado_contratacion, fecha: c.fecha_contratacion });
		for (const r of d.reportes ?? [])
			eventos.push({ usuario: nombre(r.id_reportante), accion: `Reportó a ${nombre(r.id_reportado)}`, modulo: 'Reportes', estado: r.estado_reporte, fecha: r.created });
		return eventos.sort((a, b) => f.ordenFecha(b.fecha) - f.ordenFecha(a.fecha)).slice(0, 40);
	});

	const columnasActividad = [
		{ titulo: 'Usuario', valor: (e) => e.usuario, html: (e) => h.persona(e.usuario) },
		{ titulo: 'Acción', valor: (e) => e.accion },
		{ titulo: 'Módulo', valor: (e) => e.modulo, html: (e) => h.suave(e.modulo) },
		{ titulo: 'Estado', valor: (e) => f.textoEstado(e.estado), html: (e) => h.pill(e.estado) },
		{ titulo: 'Fecha', valor: (e) => f.ordenFecha(e.fecha), html: (e) => h.suave(f.fechaHora(e.fecha), 'texto-3 fecha') }
	];

	function exportar() {
		f.descargarCSV('actividad-inwork.csv', [
			{ titulo: 'Usuario', valor: (e) => e.usuario },
			{ titulo: 'Acción', valor: (e) => e.accion },
			{ titulo: 'Módulo', valor: (e) => e.modulo },
			{ titulo: 'Estado', valor: (e) => f.textoEstado(e.estado) },
			{ titulo: 'Fecha', valor: (e) => f.fechaHora(e.fecha) }
		], actividad);
	}
</script>

<svelte:head>
	<title>Inicio | InWork</title>
</svelte:head>

<div class="pagina">
	<PageHeader titulo="Inicio" grupo="General" descripcion="Hola, {$sesion?.nombre}. Así va InWork hoy según la base de datos.">
		<button class="boton boton-claro" type="button" onclick={exportar} disabled={cargando}>
			<span class="material-symbols-rounded">download</span>
			Exportar
		</button>
		{#if $permiso('informes')}
			<a class="boton boton-suave" href="/informes">
				<span class="material-symbols-rounded">auto_awesome</span>
				Explicar con IA
			</a>
		{/if}
	</PageHeader>

	{#if cargando}
		<div class="vidrio"><Cargando texto="Cargando el resumen de la plataforma" /></div>
	{:else}
		<div class="rejilla c-5">
			{#each metricas as metrica (metrica.titulo)}
				<StatCard dato={metrica} />
			{/each}
		</div>

		{#if $permiso('trabajos')}
			<div class="rejilla c-ancha">
				<Tarjeta titulo="Evolución" subtitulo="{serie} por semana (últimas 10 semanas con movimiento)">
					{#snippet acciones()}
						<div class="segmentado">
							{#each series as opcion (opcion)}
								<button type="button" class="segmento" class:activo={opcion === serie} onclick={() => (serie = opcion)}>{opcion}</button>
							{/each}
						</div>
					{/snippet}
					<GraficoArea valores={evolucion.valores} etiquetas={evolucion.etiquetas} />
				</Tarjeta>

				<Tarjeta titulo="Trabajos por estado" subtitulo="{d.trabajos.length} trabajos en total">
					<GraficoDona segmentos={trabajosPorEstado} textoCentral="publicados" />
				</Tarjeta>
			</div>
		{/if}

		<div class="rejilla c-3">
			<Tarjeta titulo="Categorías más solicitadas" subtitulo="Trabajos publicados por categoría">
				<GraficoBarras barras={categorias} horizontal />
			</Tarjeta>

			<Tarjeta titulo="Mejores trabajadores" subtitulo="Top 5 por calificación">
				{#if mejores.length === 0}
					<p class="texto-3">Aún no hay trabajadores con calificaciones.</p>
				{:else}
					<ul class="lista">
						{#each mejores as trabajador, i (i)}
							<li>
								<div class="celda-persona">
									<span class="puesto">{i + 1}</span>
									<Avatar nombre={trabajador.nombre} tamano="chico" />
									<div>
										<strong>{trabajador.nombre}</strong>
										<small>{trabajador.oficio}, {trabajador.trabajos} trabajos</small>
									</div>
								</div>
								<span class="nota-estrella">
									<span class="material-symbols-rounded">star</span>
									{trabajador.calificacion}
								</span>
							</li>
						{/each}
					</ul>
				{/if}
			</Tarjeta>

			<Tarjeta titulo="Alertas" subtitulo="Lo que necesita atención hoy">
				{#if alertas.length === 0}
					<EmptyState icono="task_alt" titulo="Todo en orden" texto="No hay pendientes para tu rol en este momento." />
				{:else}
					<div class="alertas">
						{#each alertas as alerta (alerta.titulo)}
							<a class="alerta alerta-{alerta.tono}" href={alerta.ruta}>
								<span class="alerta-icono">
									<span class="material-symbols-rounded">{alerta.icono}</span>
								</span>
								<span class="alerta-texto">
									<strong>{alerta.titulo}</strong>
									<small>{alerta.detalle}</small>
								</span>
								<span class="material-symbols-rounded flecha">chevron_right</span>
							</a>
						{/each}
					</div>
				{/if}
			</Tarjeta>
		</div>

		<Tarjeta titulo="Actividad reciente" subtitulo="Últimos movimientos de trabajos, ofertas, contrataciones y reportes">
			{#snippet acciones()}
				{#if $permiso('auditoria')}
					<a class="boton boton-claro boton-pequeno" href="/auditoria">Ver auditoría</a>
				{/if}
			{/snippet}
			<TablaDatos datos={actividad} columnas={columnasActividad} orden={[[4, 'desc']]} vacio="Todavía no hay actividad" />
		</Tarjeta>
	{/if}
</div>

<style>
	.puesto {
		width: 18px;
		font-size: 12px;
		font-weight: 700;
		color: var(--texto-3);
		text-align: center;
	}
	.alertas {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.alerta {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.62);
		border: 1px solid var(--linea);
		transition: background-color 0.15s ease;
	}
	.alerta:hover {
		background: rgba(255, 255, 255, 0.95);
	}
	.alerta-icono {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 12px;
		flex-shrink: 0;
	}
	.alerta-rojo .alerta-icono { color: var(--rojo); background: var(--rojo-suave); }
	.alerta-ambar .alerta-icono { color: var(--ambar); background: var(--ambar-suave); }
	.alerta-morado .alerta-icono { color: var(--morado); background: var(--morado-suave); }
	.alerta-texto {
		flex: 1;
		min-width: 0;
	}
	.alerta-texto strong {
		display: block;
		font-size: 13.5px;
	}
	.alerta-texto small {
		display: block;
		font-size: 12px;
		color: var(--texto-3);
	}
	.flecha {
		color: var(--texto-3);
	}
</style>
