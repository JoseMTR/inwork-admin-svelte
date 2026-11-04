<script>
	// AUDITORÍA: quién creó, editó o borró qué y cuándo (la API la llena sola).
	import { onMount } from 'svelte';
	import { PageHeader, StatCard, Tarjeta, TablaDatos, Avatar, StatusPill, Cargando } from '#lib';
	import { api, cargarVarios } from '#lib/api.js';
	import { permiso } from '#lib/stores/sesion.js';
	import * as f from '#lib/utils/formato.js';
	import * as h from '#lib/utils/html.js';

	let cargando = $state(true);
	let d = $state({ eventos: [], usuarios: [], trabajos: [], ofertas: [], contrataciones: [] });
	let seleccionado = $state(null);

	async function cargar() {
		const { datos } = await cargarVarios({
			eventos: api.get('/auditoria/'),
			usuarios: $permiso('usuarios') ? api.get('/usuarios/') : [],
			trabajos: $permiso('trabajos') ? api.get('/trabajos/') : [],
			ofertas: $permiso('ofertas') ? api.get('/ofertas/') : [],
			contrataciones: $permiso('contrataciones') ? api.get('/contrataciones/') : []
		});
		d = datos;
		cargando = false;
		seleccionado = [...d.eventos].sort((a, b) => f.ordenFecha(b.created) - f.ordenFecha(a.created))[0] ?? null;
	}

	onMount(cargar);

	let usuariosPorId = $derived(f.mapaPor(d.usuarios, 'id_usuario'));
	let trabajosPorId = $derived(f.mapaPor(d.trabajos, 'id_trabajo'));
	let ofertasPorId = $derived(f.mapaPor(d.ofertas, 'id_oferta'));
	let contratosPorId = $derived(f.mapaPor(d.contrataciones, 'id_contratacion'));
	const nombre = (id) => (id ? f.nombreCompleto(usuariosPorId.get(id)) : 'Sistema');

	// Describe el registro afectado con nombres en vez de ids
	function registro(e) {
		switch (e.tabla) {
			case 'usuarios':
				return `Cuenta de ${nombre(e.id_registro)}`;
			case 'trabajos':
				return `Trabajo «${trabajosPorId.get(e.id_registro)?.titulo ?? 'retirado'}»`;
			case 'ofertas': {
				const o = ofertasPorId.get(e.id_registro);
				return o ? `Oferta de ${nombre(o.id_trabajador)} en «${trabajosPorId.get(o.id_trabajo)?.titulo ?? 'un trabajo'}»` : 'Oferta';
			}
			case 'contrataciones': {
				const c = contratosPorId.get(e.id_registro);
				return c ? `Contrato de «${trabajosPorId.get(c.id_trabajo)?.titulo ?? 'un trabajo'}»` : 'Contratación';
			}
			default:
				return `Registro de ${e.tabla}`;
		}
	}

	let resumen = $derived([
		{ titulo: 'Creaciones', valor: d.eventos.filter((e) => e.accion === 'INSERT').length, icono: 'add_circle', color: 'azul', detalle: 'registros nuevos' },
		{ titulo: 'Ediciones', valor: d.eventos.filter((e) => e.accion === 'UPDATE').length, icono: 'edit', color: 'morado', detalle: 'cambios de datos' },
		{ titulo: 'Eliminaciones', valor: d.eventos.filter((e) => e.accion === 'DELETE').length, icono: 'delete', color: 'rojo', detalle: 'registros desactivados' }
	]);

	const columnas = [
		{ titulo: 'Fecha', valor: (e) => f.ordenFecha(e.created), html: (e) => h.suave(f.fechaHora(e.created), 'texto-2 fecha') },
		{ titulo: 'Usuario', valor: (e) => nombre(e.id_usuario), html: (e) => h.persona(nombre(e.id_usuario)) },
		{ titulo: 'Tabla', valor: (e) => e.tabla, html: (e) => h.codigo(e.tabla) },
		{ titulo: 'Acción', valor: (e) => f.textoEstado(e.accion), html: (e) => h.pill(e.accion) },
		{ titulo: 'Registro', valor: (e) => registro(e), html: (e) => h.recortado(registro(e)) },
		{ titulo: 'IP', valor: (e) => e.ip ?? '', html: (e) => h.suave(e.ip ?? 'No registrada', 'texto-3 numero') }
	];

	function leerJSON(valor) {
		if (!valor) return null;
		if (typeof valor === 'object') return valor;
		try {
			return JSON.parse(valor);
		} catch {
			return null;
		}
	}

	let cambios = $derived.by(() => {
		if (!seleccionado) return [];
		const antes = leerJSON(seleccionado.datos_anteriores) ?? {};
		const despues = leerJSON(seleccionado.datos_nuevos) ?? {};
		const campos = [...new Set([...Object.keys(antes), ...Object.keys(despues)])].filter((c) => !c.startsWith('id_') && c !== 'password');
		return campos.map((campo) => ({ campo, antes: String(antes[campo] ?? '—'), despues: String(despues[campo] ?? '—') }));
	});

	function exportar() {
		f.descargarCSV('auditoria-inwork.csv', [
			{ titulo: 'Fecha', valor: (e) => f.fechaHora(e.created) },
			{ titulo: 'Usuario', valor: (e) => nombre(e.id_usuario) },
			{ titulo: 'Tabla', valor: (e) => e.tabla },
			{ titulo: 'Acción', valor: (e) => f.textoEstado(e.accion) },
			{ titulo: 'Registro', valor: (e) => registro(e) },
			{ titulo: 'IP', valor: (e) => e.ip ?? '' }
		], d.eventos);
	}
</script>

<svelte:head>
	<title>Auditoría | InWork</title>
</svelte:head>

<div class="pagina">
	<PageHeader titulo="Auditoría" grupo="Sistema" descripcion="Quién hizo qué y cuándo dentro de la plataforma.">
		<button class="boton boton-claro" type="button" onclick={exportar} disabled={cargando}>
			<span class="material-symbols-rounded">download</span>
			Exportar
		</button>
	</PageHeader>

	{#if cargando}
		<div class="vidrio"><Cargando texto="Cargando eventos" /></div>
	{:else}
		<div class="rejilla c-3">
			{#each resumen as dato (dato.titulo)}
				<StatCard {dato} />
			{/each}
		</div>

		<Tarjeta titulo="Eventos" subtitulo="{d.eventos.length} registrados. Haz clic en uno para ver el detalle.">
			<TablaDatos datos={d.eventos} {columnas} alSeleccionar={(e) => (seleccionado = e)} {seleccionado} clave="id_auditoria" orden={[[0, 'desc']]} />
		</Tarjeta>

		{#if seleccionado}
			<Tarjeta titulo={registro(seleccionado)} subtitulo="{f.textoEstado(seleccionado.accion)} en la tabla {seleccionado.tabla}">
				{#snippet acciones()}
					<StatusPill estado={seleccionado.accion} />
				{/snippet}
				<div class="evento">
					<div class="celda-persona">
						<Avatar nombre={nombre(seleccionado.id_usuario)} />
						<div>
							<strong>{nombre(seleccionado.id_usuario)}</strong>
							<small>{usuariosPorId.get(seleccionado.id_usuario)?.rol ?? ''}</small>
						</div>
					</div>
					<dl class="detalle">
						<div><dt>Fecha</dt><dd>{f.fechaHora(seleccionado.created)}</dd></div>
						<div><dt>IP</dt><dd>{seleccionado.ip ?? 'No registrada'}</dd></div>
					</dl>
					<div>
						<span class="subtitulo-seccion">Datos anteriores y nuevos</span>
						{#if cambios.length}
							<div class="comparacion">
								<div class="fila cabecera"><span>Campo</span><span>Antes</span><span>Después</span></div>
								{#each cambios as cambio (cambio.campo)}
									<div class="fila" class:cambiada={cambio.antes !== cambio.despues}>
										<code class="codigo">{cambio.campo}</code>
										<span class="antes">{cambio.antes}</span>
										<span class="despues">{cambio.despues}</span>
									</div>
								{/each}
							</div>
						{:else}
							<p class="texto-3 texto-chico">La API registró la acción sin guardar los valores anteriores y nuevos de este evento.</p>
						{/if}
					</div>
				</div>
			</Tarjeta>
		{/if}
	{/if}
</div>

<style>
	.evento {
		columns: 2 300px;
		column-gap: 36px;
	}
	.evento > * {
		break-inside: avoid;
		margin-bottom: 18px;
	}
	.comparacion {
		display: flex;
		flex-direction: column;
		border-radius: 14px;
		overflow: hidden;
		border: 1px solid var(--linea);
		background: rgba(255, 255, 255, 0.6);
	}
	.fila {
		display: grid;
		grid-template-columns: 0.8fr 1fr 1fr;
		gap: 10px;
		align-items: center;
		padding: 10px 12px;
		border-bottom: 1px solid var(--linea);
		font-size: 12.5px;
		word-break: break-word;
	}
	.fila:last-child {
		border-bottom: 0;
	}
	.fila.cabecera {
		font-size: 11.5px;
		font-weight: 700;
		color: var(--texto-3);
	}
	.fila.cambiada {
		background: rgba(242, 84, 27, 0.05);
	}
	.fila.cambiada .antes {
		color: var(--rojo);
		text-decoration: line-through;
	}
	.fila.cambiada .despues {
		color: var(--verde);
		font-weight: 700;
	}
</style>
