import { writable } from 'svelte/store';

export const avisos = writable([]);

let contador = 0;

export function avisar(texto, tipo = 'exito') {
	const id = ++contador;
	avisos.update((lista) => [...lista, { id, texto, tipo }]);
	setTimeout(() => quitarAviso(id), tipo === 'error' ? 6500 : 4000);
}

export function quitarAviso(id) {
	avisos.update((lista) => lista.filter((a) => a.id !== id));
}
