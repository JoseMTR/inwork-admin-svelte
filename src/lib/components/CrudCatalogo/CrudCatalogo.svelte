<script>
	// Tabla + formulario para los catálogos (países, ciudades, categorías, habilidades...).
	// Crea, edita y desactiva según los permisos del rol en la tabla rol_modulo.
	//
	// campos = [{ nombre: 'nombre', etiqueta: 'Nombre', tipo: 'text' | 'textarea' | 'select', opciones: [{ valor, texto }], requerido: true }]
	import Tarjeta from '../Tarjeta/Tarjeta.svelte';
	import TablaDatos from '../TablaDatos/TablaDatos.svelte';
	import Modal from '../Modal/Modal.svelte';
	import Confirmar from '../Confirmar/Confirmar.svelte';
	import { api } from '#lib/api.js';
	import { permiso } from '#lib/stores/sesion.js';
	import { avisar } from '#lib/stores/avisos.js';

	let {
		titulo,
		subtitulo = '',
		singular,
		datos = [],
		columnas = [],
		campos = [],
		ruta, // ej: '/paises/'
		clave, // ej: 'id_pais' (solo se usa por dentro)
		modulo, // ej: 'ubicacion'
		alCambiar = () => {},
		textoEliminar = (fila) => `Se va a desactivar «${fila.nombre}».`
	} = $props();

	let abierto = $state(false);
	let confirmar = $state(false);
	let editando = $state(null);
	let form = $state({});
	let error = $state('');
	let guardando = $state(false);
	const idForm = 'form-' + Math.random().toString(36).slice(2, 8);

	let accionesTabla = $derived([
		...($permiso(modulo, 'editar') ? [{ texto: 'Editar', icono: 'edit', soloIcono: true, alHacer: abrirEditar }] : []),
		...($permiso(modulo, 'eliminar')
			? [{ texto: 'Desactivar', icono: 'delete', tono: 'peligro', soloIcono: true, alHacer: (fila) => ((editando = fila), (confirmar = true)) }]
			: [])
	]);

	function vacio() {
		const valores = {};
		for (const campo of campos) valores[campo.nombre] = campo.tipo === 'select' ? (campo.opciones[0]?.valor ?? null) : '';
		return valores;
	}

	function abrirNuevo() {
		editando = null;
		form = vacio();
		error = '';
		abierto = true;
	}

	function abrirEditar(fila) {
		editando = fila;
		form = Object.fromEntries(campos.map((c) => [c.nombre, fila[c.nombre] ?? '']));
		error = '';
		abierto = true;
	}

	async function guardar(evento) {
		evento.preventDefault();
		for (const campo of campos) {
			if (campo.requerido !== false && (form[campo.nombre] === '' || form[campo.nombre] === null)) {
				error = `Completa el campo «${campo.etiqueta}».`;
				return;
			}
		}
		const cuerpo = {};
		for (const campo of campos) {
			const valor = form[campo.nombre];
			cuerpo[campo.nombre] = campo.tipo === 'select' && valor !== null ? Number(valor) : typeof valor === 'string' ? valor.trim() : valor;
		}
		guardando = true;
		try {
			if (editando) {
				await api.put(`${ruta}${editando[clave]}`, cuerpo);
				avisar(`${singular} actualizado`);
			} else {
				await api.post(ruta, cuerpo);
				avisar(`${singular} creado`);
			}
			abierto = false;
			await alCambiar();
		} catch (e) {
			error = e.message;
		} finally {
			guardando = false;
		}
	}

	async function eliminar() {
		await api.del(`${ruta}${editando[clave]}`);
		avisar(`${singular} desactivado`);
		await alCambiar();
	}
</script>

<Tarjeta {titulo} {subtitulo}>
	{#snippet acciones()}
		{#if $permiso(modulo, 'crear')}
			<button class="boton boton-primario boton-pequeno" type="button" onclick={abrirNuevo}>
				<span class="material-symbols-rounded">add</span>
				Nuevo
			</button>
		{:else}
			<span class="solo-lectura"><span class="material-symbols-rounded">visibility</span>Solo lectura</span>
		{/if}
	{/snippet}
	<TablaDatos {datos} {columnas} acciones={accionesTabla} porPagina={8} />
</Tarjeta>

<Modal bind:abierto titulo={editando ? `Editar ${singular.toLowerCase()}` : `Nuevo ${singular.toLowerCase()}`} ancho="480px">
	<form id={idForm} class="campos" onsubmit={guardar} novalidate>
		{#each campos as campo (campo.nombre)}
			<div class="campo">
				<label for="{idForm}-{campo.nombre}">{campo.etiqueta}</label>
				{#if campo.tipo === 'select'}
					<select id="{idForm}-{campo.nombre}" class="entrada" bind:value={form[campo.nombre]}>
						{#each campo.opciones as opcion (opcion.valor)}
							<option value={opcion.valor}>{opcion.texto}</option>
						{/each}
					</select>
				{:else if campo.tipo === 'textarea'}
					<textarea id="{idForm}-{campo.nombre}" class="entrada" bind:value={form[campo.nombre]} placeholder={campo.ayuda ?? ''}></textarea>
				{:else}
					<input id="{idForm}-{campo.nombre}" class="entrada" bind:value={form[campo.nombre]} placeholder={campo.ayuda ?? ''} />
				{/if}
			</div>
		{/each}
		{#if error}
			<p class="error-campo"><span class="material-symbols-rounded">error</span>{error}</p>
		{/if}
	</form>
	{#snippet pie()}
		<button class="boton boton-claro" type="button" onclick={() => (abierto = false)}>Cancelar</button>
		<button class="boton boton-primario" type="submit" form={idForm} disabled={guardando}>
			<span class="material-symbols-rounded">save</span>
			{guardando ? 'Guardando...' : 'Guardar'}
		</button>
	{/snippet}
</Modal>

<Confirmar bind:abierto={confirmar} titulo="Desactivar {singular.toLowerCase()}" texto={editando ? textoEliminar(editando) : ''} textoBoton="Desactivar" alConfirmar={eliminar} />

<style>
	.campos {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
</style>
