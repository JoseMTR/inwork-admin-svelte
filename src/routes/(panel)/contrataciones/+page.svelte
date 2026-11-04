<script>
	// CONTRATACIONES: los acuerdos que nacen cuando un cliente acepta una oferta.
	// Los pagos de cada contrato vienen de la API de pagos (Express + MySQL).
	import { onMount } from 'svelte';
	import { PageHeader, StatCard, Tarjeta, TablaDatos, Avatar, StatusPill, Modal, Cargando } from '#lib';
	import { api, pagosApi, cargarVarios } from '#lib/api.js';
	import { permiso } from '#lib/stores/sesion.js';
	import { avisar } from '#lib/stores/avisos.js';
	import { enfoque, tomarEnfoque } from '#lib/stores/enfoque.js';
	import { goto } from '$app/navigation';
	import * as f from '#lib/utils/formato.js';
	import * as h from '#lib/utils/html.js';

	let cargando = $state(true);
	let d = $state({ contrataciones: [], trabajos: [], usuarios: [], ofertas: [] });
	let seleccionada = $state(null);
	let custodia = $state(null);
	let pagos = $state([]);
	let estadoPago = $state('');
	let cargandoPago = $state(false);

	let modalEstado = $state(false);
	let nuevoEstado = $state('activa');
	let objetivo = $state(null);
	let guardando = $state(false);
	let errorForm = $state('');

	async function cargar() {
		const { datos } = await cargarVarios({
			contrataciones: api.get('/contrataciones/'),
			trabajos: $permiso('trabajos') ? api.get('/trabajos/') : [],
			usuarios: $permiso('usuarios') ? api.get('/usuarios/') : [],
			ofertas: $permiso('ofertas') ? api.get('/ofertas/') : []
		});
		d = datos;
		cargando = false;
		const pedido = tomarEnfoque('contrataciones');
		const elegida = pedido
			? d.contrataciones.find((c) => c.id_trabajo === pedido.id_trabajo)
			: d.contrataciones.find((c) => c.id_contratacion === seleccionada?.id_contratacion);
		elegir(elegida ?? d.contrataciones[0] ?? null);
	}

	onMount(cargar);

	let usuariosPorId = $derived(f.mapaPor(d.usuarios, 'id_usuario'));
	let trabajosPorId = $derived(f.mapaPor(d.trabajos, 'id_trabajo'));
	let ofertasPorId = $derived(f.mapaPor(d.ofertas, 'id_oferta'));
	const nombre = (id) => f.nombreCompleto(usuariosPorId.get(id));
	const trabajo = (id) => trabajosPorId.get(id)?.titulo ?? 'Trabajo';
	const valor = (c) => Number(ofertasPorId.get(c.id_oferta)?.valor_oferta) || 0;

	let resumen = $derived([
		{ titulo: 'Activas', valor: d.contrataciones.filter((c) => c.estado_contratacion === 'activa').length, icono: 'engineering', color: 'azul', detalle: 'trabajos en curso' },
		{ titulo: 'Finalizadas', valor: d.contrataciones.filter((c) => c.estado_contratacion === 'finalizada').length, icono: 'task_alt', color: 'verde', detalle: 'pagadas al trabajador' },
		{ titulo: 'Canceladas', valor: d.contrataciones.filter((c) => c.estado_contratacion === 'cancelada').length, icono: 'cancel', color: 'rojo', detalle: 'el trabajo volvió a publicarse' }
	]);

	const columnas = [
		{ titulo: 'Trabajo', valor: (c) => trabajo(c.id_trabajo), html: (c) => `<strong class="bloque-texto">${f.escapar(trabajo(c.id_trabajo))}</strong>` },
		{ titulo: 'Cliente', valor: (c) => nombre(c.id_cliente) },
		{ titulo: 'Trabajador', valor: (c) => nombre(c.id_trabajador) },
		{ titulo: 'Valor', valor: (c) => valor(c), html: (c) => h.dinero(valor(c)) },
		{ titulo: 'Fecha', valor: (c) => f.ordenFecha(c.fecha_contratacion), html: (c) => h.suave(f.fecha(c.fecha_contratacion), 'texto-2 fecha') },
		{ titulo: 'Estado', valor: (c) => f.textoEstado(c.estado_contratacion), html: (c) => h.pill(c.estado_contratacion) }
	];

	let accionesTabla = $derived(
		$permiso('contrataciones', 'editar')
			? [
					{
						texto: 'Cambiar estado',
						icono: 'sync_alt',
						soloIcono: true,
						alHacer: (c) => {
							objetivo = c;
							nuevoEstado = c.estado_contratacion;
							errorForm = '';
							modalEstado = true;
						}
					}
				]
			: []
	);

	async function elegir(contrato) {
		seleccionada = contrato;
		custodia = null;
		pagos = [];
		estadoPago = '';
		if (!contrato) return;
		cargandoPago = true;
		try {
			// La API principal le pregunta a la API de pagos por la custodia de este contrato
			custodia = await api.get(`/contrataciones/${contrato.id_contratacion}/pago`);
			if ($permiso('pagos')) pagos = await pagosApi.get(`/pagos?id_custodia=${custodia.id_custodia}`);
		} catch (e) {
			estadoPago = e.message;
		} finally {
			cargandoPago = false;
		}
	}

	const TIPOS_PAGO = { deposito: 'Depósito del cliente', liberacion: 'Pago al trabajador', comision: 'Comisión de InWork', reembolso: 'Reembolso al cliente' };

	let pasos = $derived.by(() => {
		if (!seleccionada) return [];
		const c = custodia;
		const estado = c?.estado_custodia;
		const pagado = ['asegurado', 'en_disputa', 'liberado'].includes(estado);
		const lista = [
			{ titulo: 'Oferta aceptada', detalle: f.fechaHora(seleccionada.fecha_contratacion), estado: 'hecho' },
			{ titulo: 'Pago en custodia', detalle: pagado ? 'El cliente ya depositó' : estado === 'pendiente_pago' ? 'Esperando el depósito del cliente' : 'Sin depósito', estado: pagado ? 'hecho' : 'actual' },
			{
				titulo: 'Confirmación del trabajo',
				detalle: c ? `Cliente ${c.confirmado_cliente ? 'confirmó' : 'no ha confirmado'}, trabajador ${c.confirmado_trabajador ? 'confirmó' : 'no ha confirmado'}` : '—',
				estado: c?.confirmado_cliente && c?.confirmado_trabajador ? 'hecho' : pagado ? 'actual' : ''
			}
		];
		if (estado === 'en_disputa') lista.push({ titulo: 'En disputa', detalle: c.motivo_disputa ?? 'InWork debe decidir', estado: 'actual' });
		lista.push({
			titulo: seleccionada.estado_contratacion === 'cancelada' ? 'Contratación cancelada' : 'Pago liberado y contrato finalizado',
			detalle: f.textoEstado(seleccionada.estado_contratacion),
			estado: seleccionada.estado_contratacion === 'activa' ? '' : 'hecho'
		});
		return lista;
	});

	async function guardarEstado() {
		guardando = true;
		errorForm = '';
		try {
			await api.put(`/contrataciones/${objetivo.id_contratacion}`, { estado_contratacion: nuevoEstado });
			avisar('Estado de la contratación actualizado');
			modalEstado = false;
			await cargar();
		} catch (e) {
			errorForm = e.message;
		} finally {
			guardando = false;
		}
	}

	function irA(modulo, ruta) {
		enfoque.set({ modulo, id_trabajo: seleccionada.id_trabajo, id_contratacion: seleccionada.id_contratacion });
		goto(ruta);
	}
</script>

<svelte:head>
	<title>Contrataciones | InWork</title>
</svelte:head>

<div class="pagina">
	<PageHeader titulo="Contrataciones" grupo="Marketplace" descripcion="Los acuerdos que nacen cuando un cliente acepta una oferta.">
		{#if !$permiso('contrataciones', 'editar')}
			<span class="solo-lectura"><span class="material-symbols-rounded">visibility</span>Solo lectura</span>
		{/if}
	</PageHeader>

	{#if cargando}
		<div class="vidrio"><Cargando texto="Cargando contrataciones" /></div>
	{:else}
		<div class="rejilla c-3">
			{#each resumen as dato (dato.titulo)}
				<StatCard {dato} />
			{/each}
		</div>

		<Tarjeta titulo="Contrataciones" subtitulo="Las más recientes primero. Haz clic en una para ver sus pagos.">
			<TablaDatos datos={d.contrataciones} {columnas} acciones={accionesTabla} alSeleccionar={elegir} seleccionado={seleccionada} clave="id_contratacion" orden={[[4, 'desc']]} />
		</Tarjeta>

		{#if seleccionada}
			<Tarjeta titulo={trabajo(seleccionada.id_trabajo)} subtitulo="Contratación del {f.fecha(seleccionada.fecha_contratacion)}">
				{#snippet acciones()}
					<StatusPill estado={seleccionada.estado_contratacion} />
				{/snippet}
				<div class="contrato">
					<div class="partes">
						<div class="parte">
							<span class="texto-3 texto-chico">Cliente</span>
							<div class="celda-persona">
								<Avatar nombre={nombre(seleccionada.id_cliente)} tamano="chico" />
								<strong>{nombre(seleccionada.id_cliente)}</strong>
							</div>
						</div>
						<span class="material-symbols-rounded flecha">sync_alt</span>
						<div class="parte">
							<span class="texto-3 texto-chico">Trabajador</span>
							<div class="celda-persona">
								<Avatar nombre={nombre(seleccionada.id_trabajador)} tamano="chico" />
								<strong>{nombre(seleccionada.id_trabajador)}</strong>
							</div>
						</div>
					</div>

					<div class="dato-mini">
						<span>Oferta aceptada</span>
						<strong>{f.moneda(valor(seleccionada))}</strong>
					</div>

					<div>
						<span class="subtitulo-seccion">Pagos vinculados</span>
						{#if cargandoPago}
							<p class="texto-3 texto-chico">Consultando la API de pagos...</p>
						{:else if custodia}
							<div class="custodia">
								<code class="codigo">{custodia.codigo}</code>
								<StatusPill estado={custodia.estado_custodia} />
							</div>
							{#if pagos.length}
								<ul class="lista">
									{#each pagos as pago (pago.referencia)}
										<li>
											<div>
												<strong class="bloque-texto">{TIPOS_PAGO[pago.tipo_pago] ?? pago.tipo_pago}</strong>
												<small class="texto-3">{pago.referencia}</small>
											</div>
											<strong class="numero">{f.moneda(pago.monto)}</strong>
										</li>
									{/each}
								</ul>
							{:else}
								<p class="texto-3 texto-chico">Todavía no hay movimientos de dinero.</p>
							{/if}
						{:else}
							<p class="texto-3 texto-chico">{estadoPago || 'Este contrato no tiene custodia de pago.'}</p>
						{/if}
						<p class="nota-api">
							<span class="material-symbols-rounded">cloud_sync</span>
							Estos datos vienen de la API de pagos (Express + MySQL).
						</p>
					</div>

					<div>
						<span class="subtitulo-seccion">Estado de la contratación</span>
						<ul class="linea-tiempo">
							{#each pasos as paso, i (i)}
								<li class={paso.estado}>
									<strong>{paso.titulo}</strong>
									<small>{paso.detalle}</small>
								</li>
							{/each}
						</ul>
					</div>

					<div class="acciones">
						{#if $permiso('pagos')}
							<button class="boton boton-claro boton-pequeno" type="button" onclick={() => irA('pagos', '/pagos')}>
								<span class="material-symbols-rounded">payments</span>
								Pagos
							</button>
						{/if}
						{#if $permiso('chat')}
							<button class="boton boton-suave boton-pequeno" type="button" onclick={() => irA('chat', '/chat')}>
								<span class="material-symbols-rounded">forum</span>
								Abrir chat
							</button>
						{/if}
					</div>
				</div>
			</Tarjeta>
		{/if}
	{/if}
</div>

<Modal bind:abierto={modalEstado} titulo="Cambiar estado" subtitulo={objetivo ? trabajo(objetivo.id_trabajo) : ''} ancho="440px">
	<div class="campo">
		<label for="estado-contrato">Estado</label>
		<select id="estado-contrato" class="entrada" bind:value={nuevoEstado}>
			<option value="activa">Activa</option>
			<option value="finalizada">Finalizada</option>
			<option value="cancelada">Cancelada</option>
		</select>
		<span class="ayuda">Úsalo solo para corregir casos especiales; lo normal es que el cliente finalice o cancele.</span>
	</div>
	{#if errorForm}
		<p class="error-campo"><span class="material-symbols-rounded">error</span>{errorForm}</p>
	{/if}
	{#snippet pie()}
		<button class="boton boton-claro" type="button" onclick={() => (modalEstado = false)}>Cancelar</button>
		<button class="boton boton-primario" type="button" disabled={guardando} onclick={guardarEstado}>{guardando ? 'Guardando...' : 'Guardar'}</button>
	{/snippet}
</Modal>

<style>
	.contrato {
		columns: 2 300px;
		column-gap: 36px;
	}
	.contrato > * {
		break-inside: avoid;
		margin-bottom: 18px;
	}
	.partes {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px;
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.55);
		border: 1px solid var(--linea);
	}
	.parte {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.flecha {
		color: var(--texto-3);
	}
	.custodia {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 6px;
	}
	.nota-api {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 8px;
		font-size: 12px;
		color: var(--texto-3);
	}
	.nota-api .material-symbols-rounded {
		font-size: 16px;
	}
</style>
