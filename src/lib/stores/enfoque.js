import { writable } from 'svelte/store';

export const enfoque = writable(null);

// Devuelve lo que se pidió para ese módulo y lo borra
export function tomarEnfoque(modulo) {
	let valor = null;
	enfoque.update((actual) => {
		if (actual?.modulo === modulo) {
			valor = actual;
			return null;
		}
		return actual;
	});
	return valor;
}
