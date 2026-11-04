<script>
	import { tonoEstado, textoEstado } from '#lib/utils/formato.js';

	// estado: el valor que viene de la base de datos (pendiente, activa, resuelto...)
	let { estado = '', texto = '' } = $props();
</script>

<span class="pill pill-{tonoEstado(estado)}">{texto || textoEstado(estado)}</span>
