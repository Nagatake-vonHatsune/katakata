// 👥 Students (teacher mode, Sam 17 Nov 2026): the student slots on this device. Plug in a memory card as a new slot or to
// update one, switch (the current slot saves first), save a slot's card, make its progress report, delete a slot.
import { t } from '../core/i18n';
import { deleteSlot, loadSlots, ME, slotState, switchSlot, type SlotMeta } from '../core/slots';
import { teacher } from '../core/teacher';
import { button, confirmDialog, h, mount, toast } from '../core/ui';
import { fmtDate, pickCard, plugIn, saveCard, saveReport } from './memorycard';
import { renderStrip } from './teacher';
import { topBar } from './widgets';

export async function renderStudents(root: HTMLElement, go: (r: string) => void): Promise<void> {
  if (!teacher.on) return go('');
  const store = await loadSlots();
  const redraw = () => {
    renderStrip();
    void renderStudents(root, go);
  };
  const row = (x: SlotMeta) => {
    const active = x.id === store.active;
    return h(
      'li',
      { class: 'slot-row' + (active ? ' active' : ''), 'data-slot': x.id },
      h(
        'div',
        { class: 'slot-info' },
        h('b', { class: 'slot-name' }, x.name, x.id === ME ? h('span', { class: 'muted small' }, ` (${t('slots.me')})`) : null),
        active ? h('span', { class: 'chip chip-class slot-active' }, t('slots.active')) : null,
        h('p', { class: 'small muted' }, t('slots.meta', { date: fmtDate(x.lastPlayed), n: x.chapter, w: x.words })),
      ),
      h(
        'div',
        { class: 'row slot-actions' },
        active
          ? null
          : button(t('slots.switch'), async () => {
              await switchSlot(x.id);
              toast(t('slots.switched', { name: x.name }));
              redraw();
            }, 'btn btn-primary btn-small slot-switch'),
        button('💾 ' + t('card.save'), async () => {
          const s = await slotState(x.id);
          if (s) await saveCard(s);
        }, 'btn btn-small slot-card'),
        button('📄 ' + t('card.report'), async () => {
          const s = await slotState(x.id);
          if (s) await saveReport(s);
        }, 'btn btn-small slot-report'),
        x.id === ME || active
          ? null
          : button('🗑 ' + t('slots.delete'), async () => {
              if (!(await confirmDialog(t('slots.delete_confirm', { name: x.name }), t('slots.delete'), t('common.cancel'), true))) return;
              await deleteSlot(x.id);
              redraw();
            }, 'btn btn-small btn-danger-ghost slot-delete'),
      ),
    );
  };
  mount(
    root,
    h(
      'div',
      { class: 'screen students' },
      topBar('👥 ' + t('slots.title'), () => go('')),
      h('p', { class: 'lead' }, t('slots.body')),
      button('💾 ' + t('slots.plug_in'), async () => {
        const file = await pickCard();
        if (file) await plugIn(file, redraw);
      }, 'btn btn-primary btn-wide slot-plug'),
      h('ul', { class: 'slot-list' }, store.list.map(row)),
      h('p', { class: 'muted small' }, t('slots.note')),
    ),
  );
}
