/* =========================================================
   GLOBAL EVENT BUS
   ========================================================= */
const bus = new EventTarget();

export function emit(name, detail) {
  bus.dispatchEvent(new CustomEvent(name, { detail }));
}

export function on(name, handler) {
  bus.addEventListener(name, e => handler(e.detail));
}

export function off(name, handler) {
  bus.removeEventListener(name, handler);
}
