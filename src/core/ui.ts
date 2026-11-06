// Tiny DOM helpers. No framework: the app is small and must load fast on a train.

type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, unknown> & {
  class?: string;
  style?: string;
  onclick?: (e: MouseEvent) => void;
};

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs | null = null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
      else if (k === 'class') el.className = String(v);
      else if (k === 'html') el.innerHTML = String(v);
      else if (k in el && typeof v !== 'string') (el as unknown as Record<string, unknown>)[k] = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  append(el, children);
  return el;
}

function append(el: Node, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
}

/** Append children, skipping null/false. */
export function add(el: HTMLElement, ...children: Child[]): void {
  append(el, children);
}

export function mount(root: HTMLElement, ...children: Child[]): void {
  root.replaceChildren();
  append(root, children);
  root.scrollTop = 0;
  window.scrollTo(0, 0);
}

export function button(label: Child, onclick: () => void, cls = 'btn'): HTMLButtonElement {
  return h('button', { class: cls, type: 'button', onclick: () => onclick() }, label);
}

/** Bottom-sheet style dialog. Resolves when closed. */
export function sheet(build: (close: (v?: unknown) => void) => Child, opts: { label?: string } = {}): Promise<unknown> {
  return new Promise((resolve) => {
    const prev = document.activeElement as HTMLElement | null;
    const backdrop = h('div', { class: 'sheet-backdrop' });
    const panel = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.label ?? '' });
    const close = (v?: unknown) => {
      backdrop.remove();
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
      resolve(v);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(undefined);
    };
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close(undefined);
    });
    append(panel, [build(close)]);
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    document.addEventListener('keydown', onKey);
    (panel.querySelector('textarea, input, button') as HTMLElement | null)?.focus();
  });
}

/** Confirmation that says exactly what will happen (spec 7: destructive actions). */
export async function confirmDialog(message: string, okLabel: string, cancelLabel: string, danger = false): Promise<boolean> {
  const v = await sheet((close) => [
    h('p', { class: 'sheet-text' }, message),
    h(
      'div',
      { class: 'row' },
      button(cancelLabel, () => close(false), 'btn btn-ghost'),
      button(okLabel, () => close(true), danger ? 'btn btn-danger' : 'btn btn-primary'),
    ),
  ]);
  return v === true;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;
export function toast(message: string): void {
  document.querySelector('.toast')?.remove();
  const el = h('div', { class: 'toast', role: 'status' }, message);
  document.body.appendChild(el);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 3200);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function progressBar(value: number, max: number, label?: string): HTMLElement {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return h(
    'div',
    { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(max), 'aria-valuenow': String(value), 'aria-label': label ?? '' },
    h('div', { class: 'progress-fill', style: `width:${pct}%` }),
  );
}
