<script>
	// PAGOS: todo viene de la API de pagos (Express + MySQL) usando el mismo token.
	// El administrador resuelve las disputas: le paga al trabajador o le devuelve el dinero al cliente.
	import { onMount } from 'svelte';
	import { PageHeader, StatCard, Tarjeta, TablaDatos, GraficoBarras, GraficoDona, Modal, StatusPill, Cargando, EmptyState } from '#lib';
	import { api, pagosApi, cargarVarios } from '#lib/api.js';
	import { sesion, permiso } from '#lib/stores/sesion.js';
	import { avisar } from '#lib/stores/avisos.js';
	import { tomarEnfoque } from '#lib/stores/enfoque.js';
	import * as f from '#lib/utils/formato.js';
	import * as h from '#lib/utils/html.js';

	let cargando = $state(true);
	let error = $state('');
	let d = $state({ custodias: [], pagos: [], contrataciones: [], trabajos: [], usuarios: [] });
	let seleccionada = $state(null);

	let modal = $state(false);
	let objetivo = $state(null);
	let decision = $state('liberar');
	let guardando = $state(false);
	let errorForm = $state('');

	// Resolver disputas: el permiso de editar pagos y ser del equipo que modifica (admin o moderador)
	let puedeResolver = $derived($permiso('pagos', 'editar') && [1, 2].includes($sesion?.id_rol));

	async function cargar() {
		error = '';
		const { datos, errores } = await cargarVarios({
			custodias: pagosApi.get('/custodias'),
			pagos: pagosApi.get('/pagos'),
			contrataciones: $permiso('contrataciones') ? api.get('/contrataciones/') : [],
			trabajos: $permiso('trabajos') ? api.get('/trabajos/') : [],
			usuarios: $permiso('usuarios') ? api.get('/usuarios/') : []
		});
		if (!datos.custodias.length && errores.length) error = errores[0].message;
		d = datos;
		cargando = false;
		const pedido = tomarEnfoque('pagos');
		if (pedido) seleccionada = d.custodias.find((c) => c.id_contratacion === pedido.id_contratacion) ?? null;
	}

	onMount(cargar);

	let contratosPorId = $derived(f.mapaPor(d.contrataciones, 'id_contratacion'));
	let trabajosPorId = $derived(f.mapaPor(d.trabajos, 'id_trabajo'));
	let usuariosPorCorreo = $derived(f.mapaPor(d.usuarios, 'correo'));
	const trabajo = (idContratacion) => trabajosPorId.get(contratosPorId.get(idContratacion)?.id_trabajo)?.titulo ?? 'Contrato de InWork';
	const persona = (correo) => (usuariosPorCorreo.get(correo) ? f.nombreCompleto(usuariosPorCorreo.get(correo)) : correo);

	const sumaTipo = (tipo) => f.sumar(d.pagos.filter((p) => p.tipo_pago === tipo), (p) => p.monto);
	let enCustodia = $derived(f.sumar(d.custodias.filter((c) => ['asegurado', 'en_disputa'].includes(c.estado_custodia)), (c) => c.monto));

	let resumen = $derived([
		{ titulo: 'Dinero en custodia', valor: f.millones(enCustodia), icono: 'lock', color: 'azul', detalle: 'esperando confirmación' },
		{ titulo: 'Pagado a trabajadores', valor: f.millones(sumaTipo('liberacion')), icono: 'payments', color: 'verde', detalle: 'ya liberado' },
		{ titulo: 'Comisión de InWork', valor: f.millones(sumaTipo('comision')), icono: 'account_balance', color: 'morado', detalle: 'ganancia de la plataforma' },
		{ titulo: 'Reembolsos', valor: f.millones(sumaTipo('reembolso')), icono: 'undo', color: 'rojo', detalle: 'devuelto a clientes' }
	]);

	let porTipo = $derived([
		{ etiqueta: 'Depósitos', valor: Math.round(sumaTipo('deposito') / 1000) },
		{ etiqueta: 'A trabajadores', valor: Math.round(sumaTipo('liberacion') / 1000) },
		{ etiqueta: 'Comisiones', valor: Math.round(sumaTipo('comision') / 1000) },
		{ etiqueta: 'Reembolsos', valor: Math.round(sumaTipo('reembolso') / 1000) }
	]);

	const COLORES_METODO = ['#7a5af0', '#f2541b', '#12a067', '#2f7cf6', '#d99100'];
	let metodos = $derived(
		f.contarPor(d.pagos.filter((p) => p.tipo_pago === 'deposito'), (p) => f.capitalizar(p.metodo_pago ?? 'otro')).map((m, i) => ({
			nombre: m.etiqueta,
			valor: m.valor,
			color: COLORES_METODO[i % COLORES_METODO.length]
		}))
	);

	const columnasCustodias = [
		{ titulo: 'Código', valor: (c) => c.codigo, html: (c) => h.codigo(c.codigo) },
		{ titulo: 'Trabajo', valor: (c) => trabajo(c.id_contratacion), html: (c) => `<strong class="bloque-texto">${f.escapar(trabajo(c.id_contratacion))}</strong>` },
		{ titulo: 'Cliente', valor: (c) => persona(c.correo_cliente) },
		{ titulo: 'Trabajador', valor: (c) => c.nombre_trabajador ?? persona(c.correo_trabajador) },
		{ titulo: 'Monto', valor: (c) => Number(c.monto), html: (c) => h.dinero(c.monto) },
		{
			titulo: 'Confirmaciones',
			valor: (c) => Number(c.confirmado_cliente) + Number(c.confirmado_trabajador),
			html: (c) =>
				`<span class="confirma">${c.confirmado_cliente ? '✔' : '○'} Cliente</span><span class="confirma">${c.confirmado_trabajador ? '✔' : '○'} Trabajador</span>`
		},
		{ titulo: 'Estado', valor: (c) => f.textoEstado(c.estado_custodia), html: (c) => h.pill(c.estado_custodia) }
	];

	let accionesCustodias = $derived(
		puedeResolver
			? [
					{
						texto: 'Resolver disputa',
						icono: 'gavel',
						tono: 'suave',
						mostrar: (c) => c.estado_custodia === 'en_disputa',
						alHacer: (c) => {
							objetivo = c;
							decision = 'liberar';
							errorForm = '';
							modal = true;
						}
					}
				]
			: []
	);

	const TIPOS = { deposito: 'Depósito', liberacion: 'Pago al trabajador', comision: 'Comisión', reembolso: 'Reembolso' };
	const ICONOS_METODO = { nequi: 'smartphone', daviplata: 'smartphone', pse: 'account_balance', tarjeta: 'credit_card', efectivo: 'payments' };

	let movimientos = $derived(seleccionada ? d.pagos.filter((p) => p.id_custodia === seleccionada.id_custodia) : d.pagos);

	const columnasPagos = [
		{ titulo: 'Referencia', valor: (p) => p.referencia, html: (p) => h.codigo(p.referencia) },
		{ titulo: 'Trabajo', valor: (p) => trabajo(p.id_contratacion) },
		{ titulo: 'Tipo', valor: (p) => TIPOS[p.tipo_pago], html: (p) => h.pill(p.tipo_pago, TIPOS[p.tipo_pago]) },
		{ titulo: 'Monto', valor: (p) => Number(p.monto), html: (p) => h.dinero(p.monto) },
		{
			titulo: 'Método',
			valor: (p) => p.metodo_pago ?? '',
			html: (p) => (p.metodo_pago ? h.chip(f.capitalizar(p.metodo_pago), ICONOS_METODO[p.metodo_pago] ?? 'payments') : '<span class="texto-3">Interno</span>')
		},
		{ titulo: 'Fecha', valor: (p) => f.ordenFecha(p.created), html: (p) => h.suave(f.fechaHora(p.created), 'texto-3 fecha') }
	];

	async function resolver() {
		guardando = true;
		errorForm = '';
		try {
			const respuesta = await pagosApi.post(`/custodias/${objetivo.id_custodia}/resolver`, { decision });
			avisar(respuesta.mensaje ?? 'Disputa resuelta');
			modal = false;
			await cargar();
		} catch (e) {
			errorForm = e.message;
		} finally {
			guardando = false;
		}
	}

	function exportar() {
		f.descargarCSV('pagos-inwork.csv', [
			{ titulo: 'Referencia', valor: (p) => p.referencia },
			{ titulo: 'Código custodia', valor: (p) => p.codigo_custodia },
			{ titulo: 'Trabajo', valor: (p) => trabajo(p.id_contratacion) },
			{ titulo: 'Tipo', valor: (p) => TIPOS[p.tipo_pago] },
			{ titulo: 'Monto', valor: (p) => p.monto },
			{ titulo: 'Método', valor: (p) => p.metodo_pago ?? '' },
			{ titulo: 'Fecha', valor: (p) => f.fechaHora(p.created) }
		], d.pagos);
	}
</script>

<svelte:head>
	<title>Pagos | InWork</title>
</svelte:head>

<div class="pagina">
	<PageHeader titulo="Pagos y custodias" grupo="Finanzas" descripcion="El dinero que entra a la custodia de InWork, lo que se le paga a cada trabajador y las comisiones.">
		<span class="chip origen">
			<span class="material-symbols-rounded">cloud_sync</span>
			Datos de la API de pagos
		</span>
		<button class="boton boton-claro" type="button" onclick={exportar} disabled={cargando}>
			<span class="material-symbols-rounded">download</span>
			Exportar
		</button>
	</PageHeader>

	{#if cargando}
		<div class="vidrio"><Cargando texto="Consultando la API de pagos" /></div>
	{:else if error}
		<div class="vidrio">
			<EmptyState icono="cloud_off" titulo="No se pudo conectar con la API de pagos" texto={error}>
				<button class="boton boton-primario" type="button" onclick={cargar}>Reintentar</button>
			</EmptyState>
		</div>
	{:else}
		<div class="rejilla c-4">
			{#each resumen as dato (dato.titulo)}
				<StatCard {dato} />
			{/each}
		</div>

		<div class="rejilla c-ancha">
			<Tarjeta titulo="Dinero por tipo de movimiento" subtitulo="En miles de pesos">
				<GraficoBarras barras={porTipo} color="morado" alto={300} formato={(v) => `$ ${f.numero(v)} mil`} />
			</Tarjeta>
			<Tarjeta titulo="Métodos de pago" subtitulo="{d.pagos.filter((p) => p.tipo_pago === 'deposito').length} depósitos de clientes">
				<GraficoDona segmentos={metodos} textoCentral="con {metodos[0]?.nombre ?? '—'}" />
			</Tarjeta>
		</div>

		<Tarjeta titulo="Custodias" subtitulo="Una por contratación. Haz clic en una para ver solo sus movimientos.">
			{#snippet acciones()}
				{#if !puedeResolver}
					<span class="solo-lectura"><span class="material-symbols-rounded">visibility</span>Solo lectura</span>
				{/if}
			{/snippet}
			<TablaDatos datos={d.custodias} columnas={columnasCustodias} acciones={accionesCustodias} alSeleccionar={(c) => (seleccionada = c)} seleccionado={seleccionada} clave="id_custodia" />
		</Tarjeta>

		<Tarjeta titulo="Movimientos" subtitulo={seleccionada ? `Solo de ${trabajo(seleccionada.id_contratacion)}` : 'Cada depósito pasa por la custodia antes de llegar al trabajador'}>
			{#snippet acciones()}
				{#if seleccionada}
					<button class="boton boton-claro boton-pequeno" type="button" onclick={() => (seleccionada = null)}>
						<span class="material-symbols-rounded">filter_alt_off</span>
						Ver todos
					</button>
				{/if}
			{/snippet}
			<TablaDatos datos={movimientos} columnas={columnasPagos} orden={[[5, 'desc']]} />
		</Tarjeta>
	{/if}
</div>

<Modal bind:abierto={modal} titulo="Resolver disputa" subtitulo={objetivo ? trabajo(objetivo.id_contratacion) : ''} ancho="520px">
	{#if objetivo}
		<dl class="detalle">
			<div><dt>Cliente</dt><dd>{persona(objetivo.correo_cliente)}</dd></div>
			<div><dt>Trabajador</dt><dd>{objetivo.nombre_trabajador}</dd></div>
			<div><dt>Monto en custodia</dt><dd>{f.moneda(objetivo.monto)}</dd></div>
			<div><dt>Estado</dt><dd><StatusPill estado={objetivo.estado_custodia} /></dd></div>
			<div class="ancho-total"><dt>Motivo de la disputa</dt><dd>{objetivo.motivo_disputa ?? 'Sin motivo registrado'}</dd></div>
		</dl>
		<div class="opciones">
			<label class="opcion" class:elegida={decision === 'liberar'}>
				<input type="radio" bind:group={decision} value="liberar" />
				<span class="material-symbols-rounded">payments</span>
				<strong>Pagar al trabajador</strong>
				<small>Se le transfiere el dinero menos la comisión de InWork</small>
			</label>
			<label class="opcion" class:elegida={decision === 'reembolsar'}>
				<input type="radio" bind:group={decision} value="reembolsar" />
				<span class="material-symbols-rounded">undo</span>
				<strong>Devolver al cliente</strong>
				<small>Se le reembolsa el monto completo</small>
			</label>
		</div>
	{/if}
	{#if errorForm}
		<p class="error-campo"><span class="material-symbols-rounded">error</span>{errorForm}</p>
	{/if}
	{#snippet pie()}
		<button class="boton boton-claro" type="button" onclick={() => (modal = false)}>Cancelar</button>
		<button class="boton boton-primario" type="button" disabled={guardando} onclick={resolver}>
			<span class="material-symbols-rounded">gavel</span>
			{guardando ? 'Resolviendo...' : 'Confirmar decisión'}
		</button>
	{/snippet}
</Modal>

<style>
	.origen .material-symbols-rounded {
		color: var(--morado);
	}
	:global(.confirma) {
		display: block;
		font-size: 12px;
		color: var(--texto-2);
		white-space: nowrap;
	}
	.opciones {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}
	.opcion {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 14px;
		border-radius: 14px;
		border: 1px solid var(--linea-fuerte);
		background: rgba(255, 255, 255, 0.6);
		cursor: pointer;
	}
	.opcion input {
		position: absolute;
		opacity: 0;
	}
	.opcion .material-symbols-rounded {
		color: var(--texto-3);
	}
	.opcion small {
		font-size: 12px;
		color: var(--texto-3);
	}
	.opcion.elegida {
		border-color: var(--naranja);
		background: #fff;
		box-shadow: 0 0 0 3px var(--naranja-suave);
	}
	.opcion.elegida .material-symbols-rounded {
		color: var(--naranja);
	}
	@media (max-width: 520px) {
		.opciones {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
