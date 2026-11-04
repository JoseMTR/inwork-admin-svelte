<script>
	// Mapa real (Leaflet + OpenStreetMap) con la latitud y longitud de cada trabajo.
	import { onMount } from 'svelte';
	import { moneda, escapar, textoEstado } from '#lib/utils/formato.js';

	let { trabajos = [], seleccionado = null, alSeleccionar = () => {}, nombreCategoria = () => '' } = $props();

	let contenedor = $state();
	let mapa = $state.raw(null);
	let capa = null;
	let marcadores = new Map();

	const COLORES = { publicado: '#f2541b', asignado: '#7a5af0', finalizado: '#12a067', cancelado: '#8b92a1' };

	function icono(trabajo, elegido) {
		const color = COLORES[trabajo.estado_trabajo] ?? '#f2541b';
		const tam = elegido ? 44 : 32;
		return window.L.divIcon({
			className: 'pin-mapa',
			html: `<span class="material-symbols-rounded" style="font-size:${tam}px;color:${color};font-variation-settings:'FILL' 1;filter:drop-shadow(0 4px 6px rgba(0,0,0,.25))">location_on</span>`,
			iconSize: [tam, tam],
			iconAnchor: [tam / 2, tam]
		});
	}

	onMount(() => {
		if (!window.L) return;
		mapa = window.L.map(contenedor, { scrollWheelZoom: false }).setView([10.98, -74.8], 12);
		window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 18,
			attribution: '&copy; OpenStreetMap'
		}).addTo(mapa);
		capa = window.L.layerGroup().addTo(mapa);
		return () => mapa?.remove();
	});

	// Dibuja los puntos cada vez que cambian los trabajos
	$effect(() => {
		const lista = trabajos.filter((t) => t.latitud && t.longitud);
		if (!mapa || !capa) return;
		capa.clearLayers();
		marcadores = new Map();
		for (const t of lista) {
			const marcador = window.L.marker([Number(t.latitud), Number(t.longitud)], { icon: icono(t, false) })
				.bindPopup(
					`<strong>${escapar(t.titulo)}</strong><br><span style="color:#8b92a1">${escapar(nombreCategoria(t.id_categoria))}, ${moneda(t.presupuesto)}</span><br>${escapar(textoEstado(t.estado_trabajo))}`
				)
				.on('click', () => alSeleccionar(t));
			marcador.addTo(capa);
			marcadores.set(t.id_trabajo, { marcador, trabajo: t });
		}
		if (lista.length > 0) {
			mapa.fitBounds(window.L.latLngBounds(lista.map((t) => [Number(t.latitud), Number(t.longitud)])), { padding: [30, 30], maxZoom: 13 });
		}
	});

	// Resalta y centra el trabajo elegido en la tabla
	$effect(() => {
		const elegido = seleccionado;
		if (!mapa) return;
		for (const [id, { marcador, trabajo }] of marcadores) {
			marcador.setIcon(icono(trabajo, elegido?.id_trabajo === id));
		}
		const actual = elegido && marcadores.get(elegido.id_trabajo);
		if (actual) {
			mapa.setView(actual.marcador.getLatLng(), Math.max(mapa.getZoom(), 13), { animate: true });
			actual.marcador.openPopup();
		}
	});
</script>

<div class="mapa-trabajos">
	<div class="lienzo" bind:this={contenedor}></div>
	<div class="leyenda vidrio">
		<span><i style:background={COLORES.publicado}></i>Publicado</span>
		<span><i style:background={COLORES.asignado}></i>Asignado</span>
		<span><i style:background={COLORES.finalizado}></i>Finalizado</span>
	</div>
</div>

<style>
	.mapa-trabajos {
		position: relative;
		min-height: 460px;
		height: 100%;
	}
	.lienzo {
		position: absolute;
		inset: 0;
		border-radius: 16px;
		overflow: hidden;
		background: #e8ecef;
	}
	.leyenda {
		position: absolute;
		left: 14px;
		bottom: 14px;
		z-index: 500;
		display: flex;
		gap: 14px;
		padding: 8px 12px;
		border-radius: 12px;
		font-size: 12px;
		font-weight: 600;
		background: rgba(255, 255, 255, 0.9);
	}
	.leyenda span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.leyenda i {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}
	:global(.pin-mapa) {
		background: transparent;
		border: 0;
	}
</style>
