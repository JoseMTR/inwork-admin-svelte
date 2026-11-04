<script>
	import Modal from '../Modal/Modal.svelte';
	import { avisar } from '#lib/stores/avisos.js';

	let {
		abierto = $bindable(false),
		titulo = '¿Estás seguro?',
		texto = '',
		textoBoton = 'Confirmar',
		peligro = true,
		alConfirmar = async () => {}
	} = $props();

	let trabajando = $state(false);

	async function confirmar() {
		trabajando = true;
		try {
			await alConfirmar();
			abierto = false;
		} catch (error) {
			avisar(error.message, 'error');
		} finally {
			trabajando = false;
		}
	}
</script>

<Modal bind:abierto {titulo} ancho="460px">
	<p class="texto-2">{texto}</p>
	{#snippet pie()}
		<button class="boton boton-claro" type="button" onclick={() => (abierto = false)}>Cancelar</button>
		<button class="boton {peligro ? 'boton-peligro' : 'boton-primario'}" type="button" disabled={trabajando} onclick={confirmar}>
			{trabajando ? 'Procesando...' : textoBoton}
		</button>
	{/snippet}
</Modal>
