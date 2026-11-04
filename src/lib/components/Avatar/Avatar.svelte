<script>
	import { iniciales, tonoAvatar } from '#lib/utils/formato.js';

	// tamano: 'chico', 'normal' o 'grande'
	let { nombre = '', tamano = 'normal' } = $props();
</script>

<span class="avatar avatar-{tamano} avatar-{tonoAvatar(nombre)}" title={nombre}>{iniciales(nombre)}</span>
