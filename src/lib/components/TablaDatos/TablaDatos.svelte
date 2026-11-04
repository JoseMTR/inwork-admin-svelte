<script>
	// Tabla con la librería DataTables (buscar, ordenar y paginar).
	//
	// columnas = [{
	//   titulo: 'Usuario',
	//   valor: (fila) => texto o número que se usa para ordenar y buscar,
	//   html: (fila) => HTML que se muestra en la celda (opcional),
	//   clase: 'numero' (opcional), ordenable: false (opcional)
	// }]
	// acciones = [{ texto, icono, tono: 'claro' | 'suave' | 'peligro' | 'exito', mostrar: (fila) => bool, alHacer: (fila) => {} }]
	// alSeleccionar(fila): se llama al hacer clic en una fila
	// alClicElemento(fila, valor): clic en un elemento con data-clic="valor" dentro de una celda (ej: interruptores)
	// clave: campo interno para saber qué fila está elegida (nunca se muestra en pantalla)
	import { onMount } from 'svelte';
	import { escapar } from '#lib/utils/formato.js';

	let {
		datos = [],
		columnas = [],
		acciones = [],
		alSeleccionar = null,
		alClicElemento = null,
		seleccionado = null,
		clave = null,
		porPagina = 8,
		orden = [],
		vacio = 'No hay registros para mostrar'
	} = $props();

	let elemento = $state();
	let tabla = $state.raw(null);

	const idioma = () => ({
		processing: 'Procesando...',
		search: '',
		searchPlaceholder: 'Buscar en la tabla',
		lengthMenu: 'Mostrar _MENU_',
		info: 'Mostrando _START_ a _END_ de _TOTAL_',
		infoEmpty: 'Sin registros',
		infoFiltered: '(filtrado de _MAX_)',
		zeroRecords: 'No se encontraron resultados',
		emptyTable: vacio,
		loadingRecords: 'Cargando...',
		paginate: { first: '«', previous: '‹', next: '›', last: '»' },
		aria: { orderable: 'Ordenar por esta columna', orderableReverse: 'Ordenar al revés' }
	});

	function esElegida(fila) {
		return !!(seleccionado && clave && fila && fila[clave] === seleccionado[clave]);
	}

	function htmlAcciones(fila) {
		return acciones
			.map((accion, i) => ({ accion, i }))
			.filter(({ accion }) => !accion.mostrar || accion.mostrar(fila))
			.map(
				({ accion, i }) =>
					`<button type="button" class="boton boton-${accion.tono ?? 'claro'} boton-pequeno${accion.soloIcono ? ' boton-cuadrado' : ''}" data-accion="${i}" title="${escapar(accion.texto)}" aria-label="${escapar(accion.texto)}">` +
					`<span class="material-symbols-rounded">${accion.icono}</span>${accion.soloIcono ? '' : escapar(accion.texto)}</button>`
			)
			.join('');
	}

	function alHacerClic(evento) {
		if (!tabla) return;
		const tr = evento.target.closest('tbody tr');
		if (!tr) return;
		const fila = tabla.row(tr).data();
		if (!fila) return;
		const boton = evento.target.closest('button[data-accion]');
		if (boton) {
			acciones[Number(boton.dataset.accion)]?.alHacer(fila);
			return;
		}
		const marcado = evento.target.closest('[data-clic]');
		if (marcado && alClicElemento) {
			alClicElemento(fila, marcado.dataset.clic);
			return;
		}
		if (evento.target.closest('a')) return;
		alSeleccionar?.(fila);
	}

	onMount(() => {
		const DataTable = window.DataTable;
		if (!DataTable) {
			console.error('No se cargó la librería DataTables (revisa app.html)');
			return;
		}

		const columns = columnas.map((c) => ({
			title: c.titulo,
			data: null,
			className: c.clase ?? '',
			orderable: c.ordenable !== false,
			searchable: c.buscable !== false,
			render: (_, tipo, fila) => {
				if (tipo === 'display') return c.html ? c.html(fila) : escapar(c.valor?.(fila) ?? '');
				return c.valor?.(fila) ?? '';
			}
		}));
		if (acciones.length > 0) {
			columns.push({
				title: 'Acciones',
				data: null,
				orderable: false,
				searchable: false,
				className: 'col-acciones',
				render: (_, tipo, fila) => (tipo === 'display' ? htmlAcciones(fila) : '')
			});
		}

		tabla = new DataTable(elemento, {
			data: $state.snapshot(datos),
			columns,
			pageLength: porPagina,
			lengthMenu: [5, 8, 10, 25, 50],
			order: orden,
			orderClasses: false,
			autoWidth: false,
			language: idioma(),
			createdRow: (tr) => {
				if (alSeleccionar) tr.classList.add('clicable');
			},
			rowCallback: (tr, fila) => {
				tr.classList.toggle('seleccionada', esElegida(fila));
			}
		});

		elemento.addEventListener('click', alHacerClic);

		return () => {
			elemento?.removeEventListener('click', alHacerClic);
			tabla?.destroy();
			tabla = null;
		};
	});

	// Si llegan datos nuevos se recargan las filas (sin perder la página ni la búsqueda)
	$effect(() => {
		const lista = $state.snapshot(datos);
		if (!tabla) return;
		tabla.clear();
		tabla.rows.add(lista);
		tabla.draw(false);
	});

	// Si cambia la fila elegida se vuelve a marcar
	$effect(() => {
		const elegido = seleccionado;
		if (!tabla || elegido === undefined) return;
		tabla.rows({ page: 'current' }).every(function () {
			this.node()?.classList.toggle('seleccionada', esElegida(this.data()));
		});
	});
</script>

<div class="tabla-datos">
	<table bind:this={elemento} class="tabla display" style="width: 100%"></table>
</div>

<style>
	.tabla-datos {
		width: 100%;
		min-width: 0;
	}
</style>
