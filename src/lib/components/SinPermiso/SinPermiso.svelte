<script>
	import EmptyState from '../EmptyState/EmptyState.svelte';
</script>

<section class="caja vidrio">
	<EmptyState
		icono="lock"
		titulo="No tienes permiso para ver esta página"
		texto="Tu rol no tiene este módulo en la tabla rol_modulo. Si lo necesitas, pídele a un administrador que lo active en Roles y permisos."
	>
		<a class="boton boton-primario" href="/inicio">Volver al inicio</a>
		<a class="boton boton-claro" href="/perfil">Ver mi rol</a>
	</EmptyState>
</section>

<style>
	.caja {
		max-width: 640px;
		margin: 60px auto;
		border-radius: 28px;
	}
</style>
