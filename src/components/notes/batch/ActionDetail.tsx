import { FRAG_CATS, ING_CATS, TASK_TYPES } from '../../../utils/constants';
import type { ActionState, BatchAction } from './types';
import { EditableField, Field } from './MissingField';

interface Props {
  item: ActionState;
  existingMatNames: Set<string>;
  onPatch: (patch: Partial<BatchAction>) => void;
}

export function ActionDetail({ item, existingMatNames, onPatch }: Props) {
  const a = item.action;
  const editable = item.status === 'pending';

  if (a.type === 'material_add') {
    return (
      <div className="space-y-1.5 mt-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Field label="類別:" value={ING_CATS[a.cat]?.label ?? a.cat} />
          <Field label="品名:" value={a.name} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {editable ? (
            <EditableField label="產地:" initial={a.origin ?? ''} onCommit={(v) => onPatch({ origin: v })} placeholder="產地" />
          ) : (
            <Field label="產地:" value={a.origin || ''} missing={!a.origin} />
          )}
          {editable ? (
            <EditableField label="供應商:" initial={a.supplier ?? ''} onCommit={(v) => onPatch({ supplier: v })} placeholder="供應商" />
          ) : (
            <Field label="供應商:" value={a.supplier || ''} missing={!a.supplier} />
          )}
        </div>
        {a.note && <Field label="備注:" value={a.note} />}
        {(a.qty > 0) && <Field label="庫存:" value={`${a.qty}${a.unit ?? 'g'}`} />}
        {item.status === 'skipped' && existingMatNames.has(a.name) && (
          <p className="type-micro text-ink-2">材料庫已有此品項</p>
        )}
      </div>
    );
  }

  if (a.type === 'recipe_add') {
    const tw = a.totalWeight || (a.ingredients ?? []).reduce((s, i) => s + i.amount, 0);
    const catLabel = FRAG_CATS[a.fragCat]?.label ?? a.fragCat;
    return (
      <div className="space-y-2 mt-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Field label="配方名:" value={a.name} />
          <Field label="分類:" value={catLabel} />
          <Field label="總重:" value={`${tw}g`} />
        </div>
        {(a.ingredients?.length ?? 0) > 0 && (
          <table className="w-full text-xs font-light">
            <thead>
              <tr className="text-ink-2 border-b border-border">
                <th className="text-left py-0.5 font-normal">類別</th>
                <th className="text-left py-0.5 font-normal">材料</th>
                <th className="text-right py-0.5 font-normal">份量</th>
              </tr>
            </thead>
            <tbody>
              {a.ingredients.map((ing, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-0.5 text-ink-2">{ING_CATS[ing.cat]?.label ?? ing.cat}</td>
                  <td className="py-0.5">{ing.name}</td>
                  <td className="py-0.5 text-right">{ing.amount}{ing.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {a.notes && (
          <p className="type-meta whitespace-pre-wrap">{a.notes}</p>
        )}
      </div>
    );
  }

  if (a.type === 'task_add') {
    const ttLabel = TASK_TYPES[a.taskType]?.label ?? a.taskType;
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        <Field label="標題:" value={a.title} />
        <Field label="工序:" value={ttLabel} />
        <Field label="狀態:" value={a.status ?? 'waiting'} />
        {a.notes && <Field label="備注:" value={a.notes} />}
      </div>
    );
  }

  if (a.type === 'stock_update') {
    return (
      <div className="mt-1">
        <Field label="" value={`${a.name} → ${a.qty}${a.unit}`} />
      </div>
    );
  }

  if (a.type === 'recipe_note') {
    return (
      <div className="mt-1">
        <p className="type-meta text-ink">{a.recipeName}：{a.note.slice(0, 80)}</p>
      </div>
    );
  }

  return null;
}
