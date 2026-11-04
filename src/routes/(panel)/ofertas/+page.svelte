<script>
	// OFERTAS: las propuestas que los empleados envían a cada trabajo publicado.
	import { onMount } from 'svelte';
	import { PageHeader, StatCard, Tarjeta, TablaDatos, Avatar, StatusPill, Confirmar, Cargando } from '#lib';
	import { api, cargarVarios } from '#lib/api.js';
	import { permiso } from '#lib/stores/sesion.js';
	import { avisar } from '#lib/stores/avisos.js';
	import { enfoque, tomarEnfoque } from '#lib/stores/enfoque.js';
	import { goto } from '$app/navigation';
	import * as f from '#lib/utils/formato.js';
	import * as h from '#lib/utils/html.js';

	let cargando = $state(true);
	let d = $state({ ofertas: [], trabajos: [], usuarios: [], contrataciones: [] });
	let seleccionada = $state(null);
	let confirmar = $state(false);
	let objetivo = $state(null);

	async function cargar() {
		const { datos } = await cargarVarios({
			ofertas: api.get('/ofertas/'),
			trabajos: $permiso('trabajos') ? api.get('/trabajos/') : [],
			usuarios: $permiso('usuarios') ? api.get('/usuarios/') : [],
			contrataciones: $permiso('contrataciones') ? api.get('/contrataciones/') : []
		});
		d = datos;
		cargando = false;
		const pedido = tomarEnfoque('ofertas');
		const elegida = pedido
			? d.ofertas.find((o) => o.id_trabajo === pedido.id_trabajo)
			: d.ofertas.find((o) => o.id_oferta === seleccionada?.id_oferta);
		seleccionada = elegida ?? d.ofertas[0] ?? null;
	}

	onMount(cargar);

	let usuariosPorId = $derived(f.mapaPor(d.usuarios, 'id_usuario'));
	let trabajosPorId = $derived(f.mapaPor(d.trabajos, 'id_trabajo'));
	const nombre = (id) => f.nombreCompleto(usuariosPorId.get(id));
	const trabajo = (id) => trabajosPorId.get(id);
	const presupuesto = (o) => Number(trabajo(o.id_trabajo)?.presupuesto) || 0;
	const diferencia = (o) => (presupuesto(o) ? Math.round(((Number(o.valor_oferta) - presupuesto(o)) / presupuesto(o)) * 100) : 0);

	let resumen = $derived([
		{ titulo: 'Ofertas', valor: d.ofertas.length, icono: 'local_offer', color: 'naranja', detalle: 'enviadas en total' },
		{ titulo: 'Pendientes', valor: d.ofertas.filter((o) => o.estado_oferta === 'pendiente').length, icono: 'hourglass_top', color: 'ambar', detalle: 'esperando respuesta' },
		{ titulo: 'Aceptadas', valor: d.ofertas.filter((o) => o.estado_oferta === 'aceptada').length, icono: 'handshake', color: 'verde', detalle: 'se volvieron contrato' },
		{
			titulo: 'Frente al presupuesto',
			valor: `${Math.round(f.promedio(d.ofertas, diferencia))}%`,
			icono: 'balance',
			color: 'azul',
			detalle: 'diferencia promedio de las ofertas'
		}
	]);

	const columnas = [
		{ titulo: 'Trabajo', valor: (o) => trabajo(o.id_trabajo)?.titulo ?? '', html: (o) => `<strong>${f.escapar(trabajo(o.id_trabajo)?.titulo ?? 'Trabajo')}</strong>` },
		{ titulo: 'Trabajador', valor: (o) => nombre(o.id_trabajador), html: (o) => h.persona(nombre(o.id_trabajador)) },
		{
			titulo: 'Valor ofertado',
			valor: (o) => Number(o.valor_oferta),
			html: (o) => {
				const dif = diferencia(o);
				return `${h.dinero(o.valor_oferta)}<small class="comparacion ${dif > 0 ? 'arriba' : 'abajo'}">${dif > 0 ? '+' : ''}${dif}% vs. ${f.moneda(presupuesto(o))}</small>`;
			}
		},
		{ titulo: 'Mensaje', valor: (o) => o.mensaje ?? '', html: (o) => h.recortado(o.mensaje ?? 'Sin mensaje') },
		{ titulo: 'Fecha', valor: (o) => f.ordenFecha(o.fecha_oferta), html: (o) => h.suave(f.fecha(o.fecha_oferta), 'texto-3 fecha') },
		{ titulo: 'Estado', valor: (o) => f.textoEstado(o.estado_oferta), html: (o) => h.pill(o.estado_oferta) }
	];

	let accionesTabla = $derived(
		$permiso('ofertas', 'eliminar')
			? [
					{
						texto: 'Eliminar oferta',
						icono: 'delete',
						tono: 'peligro',
						soloIcono: true,
						mostrar: (o) => o.estado_oferta !== 'aceptada',
						alHacer: (o) => ((objetivo = o), (confirmar = true))
					}
				]
			: []
	);

	let trabajador = $derived(seleccionada ? usuariosPorId.get(seleccionada.id_trabajador) : null);
	let contratosTrabajador = $derived(seleccionada ? d.contrataciones.filter((c) => c.id_trabajador === seleccionada.id_trabajador).length : 0);

	async function eliminar() {
		await api.del(`/ofertas/${objetivo.id_oferta}`);
		avisar('Oferta eliminada');
		await cargar();
	}

	function verTrabajo() {
		enfoque.set({ modulo: 'trabajos', id_trabajo: seleccionada.id_trabajo });
		goto('/trabajos');
	}
</script>

<svelte:head>
	<title>Ofertas | InWork</title>
</svelte:head>

<div class="pagina">
	<PageHeader titulo="Ofertas" grupo="Marketplace" descripcion="Las propuestas que los trabajadores envían a cada trabajo publicado.">
		{#if !$permiso('ofertas', 'eliminar')}
			<span class="solo-lectura"><span class="material-symbols-rounded">visibility</span>Solo lectura</span>
		{/if}
	</PageHeader>

	{#if cargando}
		<div class="vidrio"><Cargando texto="Cargando ofertas" /></div>
	{:else}
		<div class="rejilla c-4">
			{#each resumen as dato (dato.titulo)}
				<StatCard {dato} />
			{/each}
		</div>

		<Tarjeta titulo="Ofertas recibidas" subtitulo="Comparadas con el presupuesto que puso el cliente">
			<TablaDatos datos={d.ofertas} {columnas} acciones={accionesTabla} alSeleccionar={(o) => (seleccionada = o)} seleccionado={seleccionada} clave="id_oferta" orden={[[4, 'desc']]} />
		</Tarjeta>

		{#if seleccionada}
			<Tarjeta titulo="Oferta seleccionada" subtitulo="Enviada el {f.fechaHora(seleccionada.fecha_oferta)}">
				{#snippet acciones()}
					<StatusPill estado={seleccionada.estado_oferta} />
				{/snippet}
				<div class="oferta">
					<div class="celda-persona">
						<Avatar nombre={nombre(seleccionada.id_trabajador)} />
						<div>
							<strong>{nombre(seleccionada.id_trabajador)}</strong>
							<small>
								{trabajador && Number(trabajador.promedio_calificacion) ? `${f.decimal(trabajador.promedio_calificacion)} de calificación` : 'Sin reseñas'}, {f.cantidad(contratosTrabajador, 'contrato')}
							</small>
						</div>
					</div>

					<div class="comparar">
						<div class="dato-mini">
							<span>Ofertó</span>
							<strong>{f.moneda(seleccionada.valor_oferta)}</strong>
						</div>
						<div class="dato-mini">
							<span>Presupuesto</span>
							<strong>{f.moneda(presupuesto(seleccionada))}</strong>
						</div>
					</div>

					<div>
						<span class="subtitulo-seccion">Trabajo</span>
						<p class="fuerte">{trabajo(seleccionada.id_trabajo)?.titulo ?? 'Trabajo'}</p>
						<small class="texto-3">Cliente: {nombre(trabajo(seleccionada.id_trabajo)?.id_cliente)}</small>
					</div>

					<div>
						<span class="subtitulo-seccion">Mensaje completo</span>
						<blockquote>{seleccionada.mensaje ?? 'El trabajador no escribió mensaje.'}</blockquote>
					</div>

					<div class="acciones">
						{#if $permiso('trabajos')}
							<button class="boton boton-claro boton-pequeno" type="button" onclick={verTrabajo}>
								<span class="material-symbols-rounded">work</span>
								Ver trabajo
							</button>
						{/if}
					</div>
				</div>
			</Tarjeta>
		{/if}
	{/if}
</div>

<Confirmar
	bind:abierto={confirmar}
	titulo="Eliminar oferta"
	texto="Se eliminará la oferta de {objetivo ? nombre(objetivo.id_trabajador) : ''} por {objetivo ? f.moneda(objetivo.valor_oferta) : ''}."
	textoBoton="Eliminar"
	alConfirmar={eliminar}
/>

<style>
	:global(.comparacion) {
		display: block;
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
	}
	:global(.comparacion.arriba) {
		color: var(--rojo);
	}
	:global(.comparacion.abajo) {
		color: var(--verde);
	}
	.oferta {
		columns: 2 300px;
		column-gap: 36px;
	}
	.oferta > * {
		break-inside: avoid;
		margin-bottom: 16px;
	}
	.comparar {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}
	blockquote {
		margin: 0;
		padding: 14px 16px;
		border-left: 3px solid var(--naranja);
		border-radius: 0 14px 14px 0;
		background: rgba(255, 255, 255, 0.65);
		color: var(--texto-2);
		line-height: 1.6;
	}
</style>
