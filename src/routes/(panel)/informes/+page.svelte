<script>
	// INFORMES: se arman solos con los datos reales de las dos APIs según el periodo elegido.
	// El asistente responde preguntas con reglas sobre esos mismos datos (no usa un servicio de IA externo).
	import { onMount, tick } from 'svelte';
	import { PageHeader, Tarjeta, TablaDatos, GraficoArea, GraficoBarras, GraficoDona, ChatBubble, StatusPill, Cargando } from '#lib';
	import { api, pagosApi, cargarVarios, limpiarMemoria } from '#lib/api.js';
	import { sesion, permiso } from '#lib/stores/sesion.js';
	import * as f from '#lib/utils/formato.js';
	import * as h from '#lib/utils/html.js';

	const PERIODOS = [
		// frase: para títulos ("Informe de ...") · en: para oraciones ("... en los últimos 7 días")
		{ clave: 'hoy', texto: 'Hoy', frase: 'hoy', en: 'hoy', dias: 1 },
		{ clave: '7', texto: '7 días', frase: 'los últimos 7 días', en: 'en los últimos 7 días', dias: 7 },
		{ clave: '30', texto: '30 días', frase: 'los últimos 30 días', en: 'en los últimos 30 días', dias: 30 },
		{ clave: 'todo', texto: 'Todo', frase: 'toda la historia', en: 'en toda la historia de InWork', dias: null }
	];

	let cargando = $state(true);
	let generado = $state(null);
	let periodo = $state('30');
	let d = $state({ usuarios: [], trabajos: [], ofertas: [], contrataciones: [], categorias: [], ciudades: [], calificaciones: [], reportes: [], verificaciones: [], pagos: [], custodias: [] });

	async function cargar(forzar = false) {
		if (forzar) limpiarMemoria();
		cargando = true;
		const puede = (m) => $permiso(m);
		const { datos } = await cargarVarios({
			usuarios: puede('usuarios') ? api.get('/usuarios/') : [],
			trabajos: puede('trabajos') ? api.get('/trabajos/') : [],
			ofertas: puede('ofertas') ? api.get('/ofertas/') : [],
			contrataciones: puede('contrataciones') ? api.get('/contrataciones/') : [],
			categorias: puede('categorias') ? api.get('/categorias/') : [],
			ciudades: puede('ubicacion') ? api.get('/ciudades/') : [],
			calificaciones: puede('calificaciones') ? api.get('/calificaciones/') : [],
			reportes: puede('reportes') ? api.get('/reportes/') : [],
			verificaciones: puede('verificaciones') ? api.get('/verificaciones-identidad/') : [],
			pagos: puede('pagos') ? pagosApi.get('/pagos') : [],
			custodias: puede('pagos') ? pagosApi.get('/custodias') : []
		});
		d = datos;
		generado = new Date();
		cargando = false;
	}

	onMount(() => cargar());

	let usuariosPorId = $derived(f.mapaPor(d.usuarios, 'id_usuario'));
	let trabajosPorId = $derived(f.mapaPor(d.trabajos, 'id_trabajo'));
	let ofertasPorId = $derived(f.mapaPor(d.ofertas, 'id_oferta'));
	let categoriasPorId = $derived(f.mapaPor(d.categorias, 'id_categoria'));
	let ciudadesPorId = $derived(f.mapaPor(d.ciudades, 'id_ciudad'));
	const categoriaDe = (idTrabajo) => categoriasPorId.get(trabajosPorId.get(idTrabajo)?.id_categoria)?.nombre ?? 'Sin categoría';

	// ---------- Periodo ----------
	let elegido = $derived(PERIODOS.find((p) => p.clave === periodo));

	let rango = $derived.by(() => {
		const ahora = generado ?? new Date();
		if (!elegido.dias) return { desde: null, hasta: ahora, antes: null };
		const desde = new Date(ahora);
		if (elegido.clave === 'hoy') desde.setHours(0, 0, 0, 0);
		else desde.setTime(ahora.getTime() - elegido.dias * 86400000);
		// Hoy se compara con todo el día de ayer; los demás con un periodo igual de largo justo antes
		const largo = elegido.clave === 'hoy' ? 86400000 : ahora - desde;
		return { desde, hasta: ahora, antes: new Date(desde.getTime() - largo) };
	});

	function dentro(valor, desde, hasta) {
		const t = f.ordenFecha(valor);
		return t > 0 && (!desde || t >= desde.getTime()) && t <= hasta.getTime();
	}

	function filtrar(desde, hasta) {
		return {
			usuarios: d.usuarios.filter((u) => dentro(u.created, desde, hasta)),
			trabajos: d.trabajos.filter((t) => dentro(t.created, desde, hasta)),
			ofertas: d.ofertas.filter((o) => dentro(o.fecha_oferta ?? o.created, desde, hasta)),
			contrataciones: d.contrataciones.filter((c) => dentro(c.fecha_contratacion ?? c.created, desde, hasta)),
			calificaciones: d.calificaciones.filter((c) => dentro(c.created, desde, hasta)),
			reportes: d.reportes.filter((r) => dentro(r.created, desde, hasta)),
			pagos: d.pagos.filter((p) => dentro(p.created, desde, hasta))
		};
	}

	let actual = $derived(filtrar(rango.desde, rango.hasta));
	let anterior = $derived(rango.antes ? filtrar(rango.antes, rango.desde) : null);

	const comision = (datos) => f.sumar(datos.pagos.filter((p) => p.tipo_pago === 'comision'), (p) => p.monto);
	const promedioNotas = (datos) => f.promedio(datos.calificaciones, (c) => c.puntuacion);

	function variacion(ahora, antes) {
		if (antes === null || antes === undefined) return { variacion: '', sube: true };
		if (!antes) return { variacion: ahora ? 'Nuevo frente al periodo anterior' : 'Igual que el periodo anterior', sube: true };
		const cambio = ((ahora - antes) / antes) * 100;
		return { variacion: `${cambio >= 0 ? '+' : ''}${f.decimal(cambio)}% vs. periodo anterior`, sube: cambio >= 0 };
	}

	// ---------- Cifras clave ----------
	let cifras = $derived.by(() => {
		const lista = [];
		const agregar = (modulo, etiqueta, ahora, antes, formato = f.numero) => {
			if (!$permiso(modulo)) return;
			lista.push({ etiqueta, valor: formato(ahora), ...variacion(ahora, antes) });
		};
		agregar('usuarios', 'Usuarios nuevos', actual.usuarios.length, anterior?.usuarios.length);
		agregar('trabajos', 'Trabajos publicados', actual.trabajos.length, anterior?.trabajos.length);
		agregar('ofertas', 'Ofertas enviadas', actual.ofertas.length, anterior?.ofertas.length);
		agregar('contrataciones', 'Contrataciones', actual.contrataciones.length, anterior?.contrataciones.length);
		agregar('pagos', 'Comisión de InWork', comision(actual), anterior ? comision(anterior) : null, f.millones);
		agregar('calificaciones', 'Calificación promedio', promedioNotas(actual), anterior ? promedioNotas(anterior) : null, (v) => (v ? `${f.decimal(v)} ★` : 'Sin notas'));
		return lista;
	});

	// ---------- Narrativa ----------
	let narrativa = $derived.by(() => {
		const partes = [];
		const inicio = elegido.en.charAt(0).toUpperCase() + elegido.en.slice(1);
		const movimiento = actual.usuarios.length + actual.trabajos.length + actual.ofertas.length + actual.contrataciones.length;
		if ($permiso('usuarios')) partes.push(`se registr${actual.usuarios.length === 1 ? 'ó 1 persona nueva' : `aron ${actual.usuarios.length} personas nuevas`}`);
		if ($permiso('trabajos')) partes.push(`se publicaron ${f.cantidad(actual.trabajos.length, 'trabajo')}`);
		if ($permiso('ofertas')) partes.push(`los trabajadores enviaron ${f.cantidad(actual.ofertas.length, 'oferta')}`);
		if ($permiso('contrataciones')) partes.push(`se cerraron ${f.cantidad(actual.contrataciones.length, 'contratación', 'contrataciones')}`);
		let texto = '';
		if (partes.length && !movimiento) texto = `${inicio} no hubo registros nuevos de usuarios, trabajos, ofertas ni contrataciones.`;
		else if (partes.length) texto = `${inicio} ${partes.slice(0, -1).join(', ')}${partes.length > 1 ? ' y ' : ''}${partes.at(-1)}.`;
		const top = categoriasPeriodo[0];
		if (top) texto += ` La categoría con más movimiento fue ${top.etiqueta} con ${top.valor} trabajo${top.valor === 1 ? '' : 's'}.`;
		if ($permiso('pagos') && comision(actual)) texto += ` InWork ganó ${f.moneda(comision(actual))} en comisiones.`;
		const abiertos = d.reportes.filter((r) => ['pendiente', 'en_revision'].includes(r.estado_reporte)).length;
		if ($permiso('reportes')) texto += abiertos ? ` Quedan ${abiertos} reportes por resolver.` : ' No hay reportes abiertos.';
		return texto.trim() || 'Tu rol no tiene módulos con datos para armar el informe.';
	});

	// ---------- Gráficos ----------
	function cubetas() {
		const ahora = rango.hasta;
		const lista = [];
		if (periodo === 'hoy') {
			for (let hora = 0; hora <= ahora.getHours(); hora++) {
				const ini = new Date(ahora);
				ini.setHours(hora, 0, 0, 0);
				lista.push({ ini, fin: new Date(ini.getTime() + 3600000), etiqueta: `${hora} h` });
			}
			return lista;
		}
		if (periodo === '7') {
			for (let i = 6; i >= 0; i--) {
				const ini = new Date(ahora);
				ini.setHours(0, 0, 0, 0);
				ini.setDate(ini.getDate() - i);
				const fin = new Date(ini);
				fin.setDate(fin.getDate() + 1);
				lista.push({ ini, fin, etiqueta: ini.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }) });
			}
			return lista;
		}
		const fechas = [...actual.trabajos.map((t) => t.created), ...actual.ofertas.map((o) => o.fecha_oferta), ...actual.contrataciones.map((c) => c.fecha_contratacion)]
			.map(f.ordenFecha)
			.filter((t) => t > 0);
		const primera = rango.desde ?? new Date(fechas.length ? Math.min(...fechas) : ahora.getTime());
		let lunes = f.inicioSemana(primera);
		while (lunes && lunes <= ahora) {
			const fin = new Date(lunes);
			fin.setDate(fin.getDate() + 7);
			lista.push({ ini: lunes, fin, etiqueta: f.etiquetaSemana(lunes) });
			lunes = fin;
		}
		return lista.slice(-12);
	}

	let actividad = $derived.by(() => {
		const tiempos = [
			...actual.trabajos.map((t) => t.created),
			...actual.ofertas.map((o) => o.fecha_oferta),
			...actual.contrataciones.map((c) => c.fecha_contratacion)
		].map(f.ordenFecha);
		const lista = cubetas();
		return {
			valores: lista.map((c) => tiempos.filter((t) => t >= c.ini.getTime() && t < c.fin.getTime()).length),
			etiquetas: lista.map((c) => c.etiqueta)
		};
	});

	let categoriasPeriodo = $derived(f.contarPor(actual.trabajos, (t) => categoriasPorId.get(t.id_categoria)?.nombre).slice(0, 6));

	let contratosPorEstado = $derived([
		{ nombre: 'Activas', valor: actual.contrataciones.filter((c) => c.estado_contratacion === 'activa').length, color: '#2f7cf6' },
		{ nombre: 'Finalizadas', valor: actual.contrataciones.filter((c) => c.estado_contratacion === 'finalizada').length, color: '#12a067' },
		{ nombre: 'Canceladas', valor: actual.contrataciones.filter((c) => c.estado_contratacion === 'cancelada').length, color: '#b6bcc8' }
	]);

	// ---------- Resumen por categoría (DataTable) ----------
	let porCategoria = $derived.by(() => {
		const filas = new Map();
		const fila = (nombre) => {
			if (!filas.has(nombre)) filas.set(nombre, { categoria: nombre, trabajos: 0, ofertas: 0, contrataciones: 0, valor: 0, presupuestos: [] });
			return filas.get(nombre);
		};
		for (const t of actual.trabajos) {
			const r = fila(categoriasPorId.get(t.id_categoria)?.nombre ?? 'Sin categoría');
			r.trabajos++;
			r.presupuestos.push(Number(t.presupuesto) || 0);
		}
		for (const o of actual.ofertas) fila(categoriaDe(o.id_trabajo)).ofertas++;
		for (const c of actual.contrataciones) {
			const r = fila(categoriaDe(c.id_trabajo));
			r.contrataciones++;
			r.valor += Number(ofertasPorId.get(c.id_oferta)?.valor_oferta) || 0;
		}
		return [...filas.values()].map((r) => ({ ...r, presupuesto: r.presupuestos.length ? f.sumar(r.presupuestos, (v) => v) / r.presupuestos.length : 0 }));
	});

	const columnasCategoria = [
		{ titulo: 'Categoría', valor: (r) => r.categoria, html: (r) => `<strong>${f.escapar(r.categoria)}</strong>` },
		{ titulo: 'Trabajos', valor: (r) => r.trabajos, clase: 'numero' },
		{ titulo: 'Ofertas', valor: (r) => r.ofertas, clase: 'numero' },
		{ titulo: 'Contrataciones', valor: (r) => r.contrataciones, clase: 'numero' },
		{ titulo: 'Valor contratado', valor: (r) => r.valor, html: (r) => h.dinero(r.valor), clase: 'numero' },
		{ titulo: 'Presupuesto promedio', valor: (r) => r.presupuesto, html: (r) => (r.presupuesto ? h.dinero(r.presupuesto) : h.suave('—', 'texto-3')), clase: 'numero' }
	];

	// ---------- Hallazgos y recomendaciones ----------
	let hallazgos = $derived.by(() => {
		const lista = [];
		if ($permiso('trabajos') && $permiso('ofertas')) {
			const sinOfertas = d.trabajos.filter((t) => t.estado_trabajo === 'publicado' && !d.ofertas.some((o) => o.id_trabajo === t.id_trabajo)).length;
			if (sinOfertas) lista.push({ tono: 'ambar', icono: 'campaign', texto: `${sinOfertas} trabajo${sinOfertas === 1 ? '' : 's'} publicado${sinOfertas === 1 ? '' : 's'} todavía no recibe${sinOfertas === 1 ? '' : 'n'} ofertas. Conviene avisar a los trabajadores de esa categoría.` });
		}
		const top = categoriasPeriodo[0];
		if (top && actual.trabajos.length)
			lista.push({ tono: 'verde', icono: 'trending_up', texto: `${top.etiqueta} concentra el ${f.porcentaje(top.valor, actual.trabajos.length)} de los trabajos publicados ${elegido.en}.` });
		if ($permiso('ofertas') && actual.ofertas.length) {
			const aceptadas = actual.ofertas.filter((o) => o.estado_oferta === 'aceptada').length;
			lista.push({ tono: 'naranja', icono: 'local_offer', texto: `Se aceptó el ${f.porcentaje(aceptadas, actual.ofertas.length)} de las ofertas (${aceptadas} de ${actual.ofertas.length}).` });
			const relaciones = actual.ofertas
				.map((o) => Number(o.valor_oferta) / Number(trabajosPorId.get(o.id_trabajo)?.presupuesto))
				.filter((x) => Number.isFinite(x) && x > 0);
			if (relaciones.length) {
				const media = (f.sumar(relaciones, (x) => x) / relaciones.length - 1) * 100;
				lista.push({ tono: 'naranja', icono: 'balance', texto: `Las ofertas llegan en promedio un ${f.decimal(Math.abs(media))}% ${media <= 0 ? 'por debajo' : 'por encima'} del presupuesto del cliente.` });
			}
		}
		if ($permiso('contrataciones') && actual.contrataciones.length) {
			const canceladas = actual.contrataciones.filter((c) => c.estado_contratacion === 'cancelada').length;
			if (canceladas / actual.contrataciones.length >= 0.2)
				lista.push({ tono: 'ambar', icono: 'cancel', texto: `${canceladas} de ${actual.contrataciones.length} contrataciones se cancelaron. Vale la pena revisar por qué.` });
		}
		if ($permiso('reportes')) {
			const abiertos = d.reportes.filter((r) => ['pendiente', 'en_revision'].includes(r.estado_reporte)).length;
			if (abiertos) lista.push({ tono: 'ambar', icono: 'flag', texto: `Hay ${abiertos} reporte${abiertos === 1 ? '' : 's'} sin resolver entre usuarios.` });
		}
		if ($permiso('verificaciones')) {
			const pendientes = d.verificaciones.filter((v) => v.estado_verificacion === 'pendiente').length;
			if (pendientes) lista.push({ tono: 'ambar', icono: 'badge', texto: `${pendientes} verificaci${pendientes === 1 ? 'ón' : 'ones'} de identidad esperan revisión.` });
		}
		if ($permiso('pagos')) {
			const disputas = d.custodias.filter((c) => c.estado_custodia === 'en_disputa').length;
			if (disputas) lista.push({ tono: 'naranja', icono: 'gavel', texto: `${disputas} pago${disputas === 1 ? '' : 's'} en custodia está${disputas === 1 ? '' : 'n'} en disputa y esperan decisión.` });
		}
		if ($permiso('usuarios')) {
			const bajos = d.usuarios.filter((u) => u.id_rol === 5 && Number(u.total_calificaciones) >= 2 && Number(u.promedio_calificacion) < 3.5).length;
			if (bajos) lista.push({ tono: 'ambar', icono: 'star_half', texto: `${bajos} trabajador${bajos === 1 ? ' tiene' : 'es tienen'} un promedio menor a 3,5 estrellas.` });
		}
		if (!lista.length) lista.push({ tono: 'verde', icono: 'verified', texto: 'No se encontraron alertas en este periodo.' });
		return lista;
	});

	// ---------- Asistente ----------
	const SUGERENCIAS = [
		'Resumen del periodo',
		'¿Cuánto ganó InWork en comisión?',
		'¿Qué categorías tienen más trabajos?',
		'¿Quiénes son los mejores trabajadores?',
		'¿Cuántos reportes hay abiertos?',
		'¿En qué ciudades hay más trabajos?',
		'¿Cómo van las ofertas?',
		'¿Cuántos usuarios hay por rol?'
	];

	let mensajes = $state.raw([]);
	let pregunta = $state('');
	let zonaMensajes = $state();
	const horaActual = () => new Date().toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
	const sinPermiso = (modulo) => ({ texto: `Tu rol no tiene acceso al módulo de ${modulo}, así que no puedo responder eso.` });

	function responder(texto) {
		const t = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
		const tiene = (...palabras) => palabras.some((p) => t.includes(p));
		const frase = elegido.en;
		const Frase = frase.charAt(0).toUpperCase() + frase.slice(1);

		if (tiene('comision', 'gan', 'ingreso', 'dinero', 'plata', 'pago', 'custodia', 'disputa')) {
			if (!$permiso('pagos')) return sinPermiso('pagos');
			const depositos = f.sumar(actual.pagos.filter((p) => p.tipo_pago === 'deposito'), (p) => p.monto);
			const disputas = d.custodias.filter((c) => c.estado_custodia === 'en_disputa').length;
			return {
				texto: `${Frase} InWork ganó ${f.moneda(comision(actual))} en comisiones sobre ${f.moneda(depositos)} depositados por los clientes. ${disputas ? `Hay ${disputas} pago${disputas === 1 ? '' : 's'} en disputa.` : 'No hay pagos en disputa.'}`,
				cifras: [
					{ etiqueta: 'Comisión', valor: f.millones(comision(actual)) },
					{ etiqueta: 'Depósitos', valor: f.millones(depositos) },
					{ etiqueta: 'En disputa', valor: f.numero(disputas) }
				]
			};
		}
		if (tiene('categor')) {
			if (!$permiso('trabajos')) return sinPermiso('trabajos');
			if (!categoriasPeriodo.length) return { texto: `No se publicaron trabajos ${frase}.` };
			return { texto: `Estas son las categorías con más trabajos publicados ${frase}:`, barras: categoriasPeriodo, color: 'naranja' };
		}
		if (tiene('mejor', 'trabajador', 'calific', 'estrella', 'nota')) {
			if (!$permiso('usuarios')) return sinPermiso('usuarios');
			const mejores = d.usuarios
				.filter((u) => u.id_rol === 5 && Number(u.total_calificaciones) > 0)
				.sort((a, b) => Number(b.promedio_calificacion) - Number(a.promedio_calificacion) || b.total_calificaciones - a.total_calificaciones)
				.slice(0, 5);
			if (!mejores.length) return { texto: 'Todavía no hay trabajadores con calificaciones.' };
			return {
				texto: `Los trabajadores mejor calificados son ${mejores.slice(0, 3).map((u) => f.nombreCompleto(u)).join(', ')}.`,
				barras: mejores.map((u) => ({ etiqueta: f.nombreCompleto(u), valor: Number(u.promedio_calificacion) })),
				color: 'verde',
				formato: (v) => `${f.decimal(v)} ★`
			};
		}
		if (tiene('report', 'denuncia', 'moderac', 'queja')) {
			if (!$permiso('reportes')) return sinPermiso('reportes');
			const abiertos = d.reportes.filter((r) => ['pendiente', 'en_revision'].includes(r.estado_reporte));
			return {
				texto: abiertos.length ? `Hay ${abiertos.length} reporte${abiertos.length === 1 ? '' : 's'} abierto${abiertos.length === 1 ? '' : 's'}. Por motivo:` : 'No hay reportes abiertos. Todos los reportes están resueltos o rechazados.',
				barras: f.contarPor(abiertos, (r) => f.textoEstado(r.motivo)),
				color: 'rojo'
			};
		}
		if (tiene('ciudad', 'donde', 'lugar', 'zona')) {
			if (!$permiso('trabajos')) return sinPermiso('trabajos');
			const barras = f.contarPor(actual.trabajos, (t) => ciudadesPorId.get(t.id_ciudad)?.nombre ?? 'Sin ciudad').slice(0, 6);
			if (!barras.length) return { texto: `No se publicaron trabajos ${frase}.` };
			return { texto: `Ciudades con más trabajos publicados ${frase}:`, barras, color: 'azul' };
		}
		if (tiene('oferta', 'acept', 'presupuesto')) {
			if (!$permiso('ofertas')) return sinPermiso('ofertas');
			const total = actual.ofertas.length;
			const aceptadas = actual.ofertas.filter((o) => o.estado_oferta === 'aceptada').length;
			const pendientes = actual.ofertas.filter((o) => o.estado_oferta === 'pendiente').length;
			return {
				texto: total ? `${Frase} llegaron ${total} ofertas: se aceptó el ${f.porcentaje(aceptadas, total)} y ${pendientes} siguen esperando respuesta del cliente.` : `No llegaron ofertas ${frase}.`,
				cifras: [
					{ etiqueta: 'Ofertas', valor: f.numero(total) },
					{ etiqueta: 'Aceptadas', valor: f.numero(aceptadas) },
					{ etiqueta: 'Pendientes', valor: f.numero(pendientes) }
				]
			};
		}
		if (tiene('usuario', 'registr', 'empleador', 'empleado', 'rol', 'persona')) {
			if (!$permiso('usuarios')) return sinPermiso('usuarios');
			return {
				texto: `InWork tiene ${d.usuarios.length} usuarios activos. ${Frase} se registraron ${actual.usuarios.length}.`,
				barras: f.contarPor(d.usuarios, (u) => u.rol),
				color: 'morado'
			};
		}
		if (tiene('resumen', 'informe', 'periodo', 'como va', 'general', 'hola')) {
			return { texto: narrativa, cifras: cifras.slice(0, 3).map((c) => ({ etiqueta: c.etiqueta, valor: c.valor })) };
		}
		return { texto: 'No encontré eso en los datos. Puedo responder sobre comisiones y pagos, categorías, mejores trabajadores, reportes, ciudades, ofertas y usuarios.' };
	}

	async function preguntar(texto) {
		const limpio = texto.trim();
		if (!limpio || cargando) return;
		mensajes = [...mensajes, { propio: true, texto: limpio, hora: horaActual() }, { propio: false, hora: horaActual(), ...responder(limpio) }];
		pregunta = '';
		await tick();
		zonaMensajes?.scrollTo({ top: zonaMensajes.scrollHeight, behavior: 'smooth' });
	}

	function enviar(evento) {
		evento.preventDefault();
		preguntar(pregunta);
	}

	// ---------- Descargas ----------
	function exportar() {
		const filas = [
			...cifras.map((c) => ({ seccion: 'Cifras clave', concepto: c.etiqueta, valor: c.valor, detalle: c.variacion })),
			...porCategoria.map((r) => ({
				seccion: 'Categorías',
				concepto: r.categoria,
				valor: `${r.trabajos} trabajos · ${r.ofertas} ofertas · ${r.contrataciones} contrataciones`,
				detalle: f.moneda(r.valor)
			})),
			...hallazgos.map((x) => ({ seccion: 'Hallazgos', concepto: x.texto, valor: '', detalle: '' }))
		];
		f.descargarCSV(`informe-inwork-${elegido.clave}.csv`, [
			{ titulo: 'Sección', valor: (x) => x.seccion },
			{ titulo: 'Concepto', valor: (x) => x.concepto },
			{ titulo: 'Valor', valor: (x) => x.valor },
			{ titulo: 'Detalle', valor: (x) => x.detalle }
		], filas);
	}
</script>

<svelte:head>
	<title>Informes | InWork</title>
</svelte:head>

<div class="pagina">
	<PageHeader titulo="Informes" grupo="General" descripcion="Se generan solos con los datos reales de InWork. Elige el periodo y descárgalos en PDF o Excel.">
		<div class="segmentado no-imprimir" role="tablist" aria-label="Periodo del informe">
			{#each PERIODOS as p (p.clave)}
				<button type="button" role="tab" aria-selected={p.clave === periodo} class="segmento" class:activo={p.clave === periodo} onclick={() => (periodo = p.clave)}>{p.texto}</button>
			{/each}
		</div>
		<button class="boton boton-claro no-imprimir" type="button" onclick={() => cargar(true)} disabled={cargando} title="Volver a leer los datos">
			<span class="material-symbols-rounded">refresh</span>
			Actualizar
		</button>
	</PageHeader>

	{#if cargando}
		<div class="vidrio"><Cargando texto="Armando el informe" /></div>
	{:else}
		<div class="rejilla c-lateral informe-rejilla">
			<div class="columna">
				<article class="informe vidrio elegido">
					<header class="informe-cabecera">
						<span class="informe-icono"><span class="material-symbols-rounded">description</span></span>
						<div class="informe-titulo">
							<h3>Informe de {elegido.frase}</h3>
							<small>Generado el {f.fechaHora(generado)} por {$sesion?.nombre}</small>
						</div>
						<StatusPill estado="activo" texto="Listo" />
					</header>
					<p class="resumen">{narrativa}</p>
					{#if cifras.length}
						<div class="rejilla c-3 cifras">
							{#each cifras as cifra (cifra.etiqueta)}
								<div class="dato-mini">
									<span>{cifra.etiqueta}</span>
									<strong>{cifra.valor}</strong>
									{#if cifra.variacion}<em class="cambio" class:sube={cifra.sube} class:baja={!cifra.sube}>{cifra.variacion}</em>{/if}
								</div>
							{/each}
						</div>
					{/if}
					<div class="acciones no-imprimir">
						<button class="boton boton-claro boton-pequeno" type="button" onclick={() => window.print()}>
							<span class="material-symbols-rounded">picture_as_pdf</span>
							Descargar PDF
						</button>
						<button class="boton boton-claro boton-pequeno" type="button" onclick={exportar}>
							<span class="material-symbols-rounded">table_view</span>
							Excel
						</button>
					</div>
				</article>

				<Tarjeta titulo="Actividad" subtitulo="Trabajos, ofertas y contrataciones registrados {periodo === 'hoy' ? 'por hora' : periodo === '7' ? 'por día' : 'por semana'}">
					<GraficoArea valores={actividad.valores} etiquetas={actividad.etiquetas} />
				</Tarjeta>

				<div class="rejilla c-2">
					<Tarjeta titulo="Trabajos por categoría" subtitulo="Publicados en el periodo">
						<GraficoBarras barras={categoriasPeriodo} horizontal />
					</Tarjeta>
					<Tarjeta titulo="Contrataciones" subtitulo="Estado de las contrataciones del periodo">
						<GraficoDona segmentos={contratosPorEstado} textoCentral="contratos" />
					</Tarjeta>
				</div>

				<Tarjeta titulo="Resumen por categoría" subtitulo="Cuánto se movió cada categoría {elegido.en}">
					<TablaDatos datos={porCategoria} columnas={columnasCategoria} orden={[[1, 'desc']]} vacio="No hubo movimiento en este periodo" />
				</Tarjeta>
			</div>

			<div class="columna">
				<Tarjeta titulo="Hallazgos y recomendaciones" subtitulo="Detectados automáticamente en los datos">
					<ul class="hallazgos">
						{#each hallazgos as hallazgo, i (i)}
							<li class="hallazgo hallazgo-{hallazgo.tono}">
								<span class="material-symbols-rounded">{hallazgo.icono}</span>
								{hallazgo.texto}
							</li>
						{/each}
					</ul>
				</Tarjeta>

				<section class="asistente vidrio no-imprimir" aria-label="Asistente de informes">
					<header class="asistente-cabecera">
						<div>
							<h2>Asistente de informes</h2>
							<small>Responde con los datos de {elegido.frase}</small>
						</div>
						<span class="chip"><span class="material-symbols-rounded">lock</span>Solo lectura</span>
					</header>

					<div class="mensajes" bind:this={zonaMensajes}>
						<ChatBubble autor="Asistente InWork" hora={generado ? f.horaDe(generado) : ''} ia>
							<p>Hola, {$sesion?.nombre?.split(' ')[0]}. Pregúntame por comisiones, categorías, trabajadores, reportes, ciudades u ofertas y te respondo con los datos reales.</p>
						</ChatBubble>
						{#each mensajes as mensaje, i (i)}
							<ChatBubble autor={mensaje.propio ? 'Tú' : 'Asistente InWork'} hora={mensaje.hora} propio={mensaje.propio} ia={!mensaje.propio}>
								<p>{mensaje.texto}</p>
								{#if mensaje.cifras?.length}
									<div class="cifras-chat">
										{#each mensaje.cifras as cifra (cifra.etiqueta)}
											<div class="dato-mini"><span>{cifra.etiqueta}</span><strong>{cifra.valor}</strong></div>
										{/each}
									</div>
								{/if}
								{#if mensaje.barras?.length}
									<div class="barras-chat">
										<GraficoBarras barras={mensaje.barras} horizontal color={mensaje.color ?? 'naranja'} formato={mensaje.formato ?? ((v) => v)} />
									</div>
								{/if}
							</ChatBubble>
						{/each}
					</div>

					<div class="sugerencias">
						{#each SUGERENCIAS as sugerencia (sugerencia)}
							<button class="chip sugerencia" type="button" onclick={() => preguntar(sugerencia)}>
								<span class="material-symbols-rounded">auto_awesome</span>
								{sugerencia}
							</button>
						{/each}
					</div>

					<form class="escribir" onsubmit={enviar}>
						<input class="entrada" type="text" bind:value={pregunta} placeholder="Pregunta algo sobre los datos de InWork" aria-label="Pregunta" />
						<button class="boton boton-primario boton-icono" type="submit" aria-label="Enviar" disabled={!pregunta.trim()}>
							<span class="material-symbols-rounded">send</span>
						</button>
					</form>
					<p class="nota texto-3">Las respuestas se calculan con reglas sobre los datos de la base de datos; no se envía información a servicios externos.</p>
				</section>
			</div>
		</div>
	{/if}
</div>

<style>
	.columna {
		display: flex;
		flex-direction: column;
		gap: 20px;
		min-width: 0;
	}
	.informe {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 20px 22px;
	}
	.informe.elegido {
		border-color: rgba(242, 84, 27, 0.45);
		box-shadow: var(--sombra), 0 0 0 3px var(--naranja-suave);
	}
	.informe-cabecera {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.informe-icono {
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		border-radius: 13px;
		color: var(--naranja);
		background: var(--naranja-suave);
		flex-shrink: 0;
	}
	.informe-titulo {
		flex: 1;
		min-width: 0;
	}
	.informe-titulo h3 {
		font-size: 15.5px;
		font-weight: 700;
	}
	.informe-titulo small {
		color: var(--texto-3);
	}
	.resumen {
		color: var(--texto-2);
		line-height: 1.6;
		max-width: 75ch;
	}
	.cifras {
		gap: 10px;
	}
	.cambio {
		display: block;
		margin-top: 2px;
		font-style: normal;
		font-size: 11.5px;
		font-weight: 700;
	}
	.cambio.sube {
		color: var(--verde);
	}
	.cambio.baja {
		color: var(--rojo);
	}
	.acciones {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.hallazgos {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.hallazgo {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 10px 12px;
		border-radius: 12px;
		font-size: 13px;
		background: rgba(255, 255, 255, 0.6);
	}
	.hallazgo .material-symbols-rounded {
		font-size: 18px;
	}
	.hallazgo-verde .material-symbols-rounded {
		color: var(--verde);
	}
	.hallazgo-ambar .material-symbols-rounded {
		color: var(--ambar);
	}
	.hallazgo-naranja .material-symbols-rounded {
		color: var(--naranja);
	}
	.asistente {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 18px;
	}
	.asistente-cabecera {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 10px;
	}
	.asistente-cabecera h2 {
		font-size: 15.5px;
		font-weight: 700;
	}
	.asistente-cabecera small {
		color: var(--texto-3);
		font-size: 12px;
	}
	.mensajes {
		display: flex;
		flex-direction: column;
		gap: 12px;
		max-height: 460px;
		overflow-y: auto;
		padding-right: 4px;
	}
	.cifras-chat {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
		gap: 8px;
		margin-top: 10px;
	}
	.cifras-chat .dato-mini strong {
		font-size: 15px;
	}
	.barras-chat {
		margin-top: 10px;
	}
	.sugerencias {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.sugerencia {
		cursor: pointer;
		border: 1px solid var(--linea);
		font-size: 12px;
	}
	.sugerencia:hover {
		color: var(--naranja);
		border-color: rgba(242, 84, 27, 0.4);
	}
	.sugerencia .material-symbols-rounded {
		font-size: 15px;
		color: var(--naranja);
	}
	.escribir {
		display: flex;
		gap: 8px;
	}
	.escribir .entrada {
		flex: 1;
		min-width: 0;
	}
	.nota {
		font-size: 11.5px;
		line-height: 1.5;
	}
	@media print {
		.informe-rejilla {
			grid-template-columns: minmax(0, 1fr) !important;
		}
	}
</style>
