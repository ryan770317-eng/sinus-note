import type { Recipe, Material, Task, Note } from '../../types';
import { FRAG_CATS, ING_CATS, RECIPE_STATUS, TASK_TYPES, TASK_STATUS } from '../../utils/constants';
import { calcProgress, daysUntil, fmtDate, formatNoteDate } from '../../utils/date';
import { ProgressBar } from '../shared/ProgressBar';

// ── colour helpers ──────────────────────────────────────────────────
const PHASE_COLOR: Record<string, string> = {
  pre:   '#6B6459',  // ink-2 (warm grey)
  make:  '#8B6F52',  // accent (warm brown)
  post:  '#7a8c6e',  // muted green
  other: '#6B6459',
};

const STATUS_BG: Record<string, string> = {
  success:  'rgba(139,111,82,0.12)',
  fail:     'rgba(160,96,80,0.12)',
  pending:  'rgba(107,100,89,0.08)',
  progress: 'rgba(139,111,82,0.08)',
  order:    'rgba(107,100,89,0.08)',
};

const STATUS_BORDER: Record<string, string> = {
  success:  '#8B6F52',
  fail:     '#a06050',
  pending:  '#D6CFC4',
  progress: '#8B6F52',
  order:    '#D6CFC4',
};

interface Props {
  recipes: Recipe[];
  tasks: Task[];
  materials: Material[];
  notes: Note[];
  isMock: boolean;
  onTabChange: (tab: 'recipe' | 'task' | 'material' | 'notes') => void;
  onRecipeClick: (id: number) => void;
  onTaskClick: () => void;
}

export function Dashboard({
  recipes,
  tasks,
  materials,
  notes,
  isMock,
  onTabChange,
  onRecipeClick,
}: Props) {
  const today = new Date().toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' });

  // ── Alerts: overdue or due ≤ 3 days ─────────────────────────────
  const alertTasks = tasks.filter((t) => {
    if (t.status === 'done') return false;
    const tt = TASK_TYPES[t.taskType];
    if (tt.defaultDays === 0) return true;
    if (!t.dueDate) return false;
    return daysUntil(t.dueDate) <= 3;
  });

  // ── Active tasks (not done) ──────────────────────────────────────
  const activeTasks = tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate > b.dueDate ? 1 : -1;
    })
    .slice(0, 5);

  // ── Recent recipes ───────────────────────────────────────────────
  const recentRecipes = [...recipes]
    .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))
    .slice(0, 4);

  // ── Material stats ───────────────────────────────────────────────
  const matByCat = {} as Record<string, number>;
  for (const m of materials) matByCat[m.cat] = (matByCat[m.cat] ?? 0) + 1;

  // ── Stats ────────────────────────────────────────────────────────
  const successCount = recipes.filter((r) => r.status === 'success').length;
  const progressCount = recipes.filter((r) => r.status === 'progress').length;
  const doneTaskCount = tasks.filter((t) => t.status === 'done').length;

  return (
    <div className="max-w-content mx-auto px-4 pt-7 pb-20">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-ink tracking-wide">SINUS NOTE</h1>
        <p className="text-xs text-ink-2 font-light mt-0.5">{today}</p>
      </div>

      {/* Mock data banner */}
      {isMock && (
        <div className="mb-5 px-3 py-2 border border-dashed border-ink-4 text-xs text-ink-3 font-light">
          目前顯示示範資料（假），登入後將自動載入您的真實資料
        </div>
      )}

      {/* ── Stats row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: '配方總數', value: recipes.length, sub: `${successCount} 成功` },
          { label: '進行中', value: progressCount + activeTasks.filter(t => !['done','ready'].includes(t.status)).length, sub: '配方＋工序' },
          { label: '已完工序', value: doneTaskCount, sub: `共 ${tasks.length} 筆` },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border px-3 py-3 text-center">
            <p className="font-serif text-2xl text-ink">{s.value}</p>
            <p className="text-[10px] text-ink-2 tracking-label mt-0.5">{s.label}</p>
            <p className="text-[10px] text-ink-4 font-light">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Alert tasks ───────────────────────────────────────── */}
      {alertTasks.length > 0 && (
        <div className="mb-6">
          <SectionHeader title="需要注意" count={alertTasks.length} color="#a06050" onMore={() => onTabChange('task')} />
          <div className="space-y-2">
            {alertTasks.map((t) => {
              const tt = TASK_TYPES[t.taskType];
              const isInstant = tt.defaultDays === 0;
              let urgency = '';
              let urgencyColor = '';
              if (isInstant) { urgency = TASK_STATUS[t.status].label; urgencyColor = '#8B6F52'; }
              else if (t.dueDate) {
                const d = daysUntil(t.dueDate);
                if (d < 0) { urgency = `逾期 ${Math.abs(d)} 天`; urgencyColor = '#a06050'; }
                else if (d === 0) { urgency = '今天到期'; urgencyColor = '#a06050'; }
                else { urgency = `剩 ${d} 天`; urgencyColor = '#8B6F52'; }
              }
              const recipe = t.recipeId ? recipes.find((r) => r.id === t.recipeId) : null;
              return (
                <div
                  key={t.id}
                  className="border border-border px-4 py-3 cursor-pointer hover:border-ink-2 transition-colors"
                  style={{ borderLeftWidth: 3, borderLeftColor: urgencyColor }}
                  onClick={() => onTabChange('task')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] tracking-label mb-0.5" style={{ color: PHASE_COLOR[tt.phase] }}>
                        {tt.icon} {tt.label}
                        {recipe && <span className="text-ink-4 ml-1">· {recipe.name}</span>}
                      </p>
                      <p className="text-sm font-serif text-ink truncate">{t.title}</p>
                    </div>
                    <span className="text-xs font-light shrink-0" style={{ color: urgencyColor }}>{urgency}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Active tasks ──────────────────────────────────────── */}
      {activeTasks.length > 0 && (
        <div className="mb-6">
          <SectionHeader title="工序進行中" count={activeTasks.length} onMore={() => onTabChange('task')} />
          <div className="space-y-2">
            {activeTasks.map((t) => {
              const tt = TASK_TYPES[t.taskType];
              const isInstant = tt.defaultDays === 0;
              const progress = !isInstant && t.dueDate ? calcProgress(t.startDate, t.dueDate) : null;
              const phaseColor = PHASE_COLOR[tt.phase];
              const recipe = t.recipeId ? recipes.find((r) => r.id === t.recipeId) : null;
              return (
                <div
                  key={t.id}
                  className="border border-border px-4 py-3 cursor-pointer hover:border-ink-2 transition-colors"
                  style={{ borderLeftWidth: 3, borderLeftColor: phaseColor }}
                  onClick={() => onTabChange('task')}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] tracking-label mb-0.5" style={{ color: phaseColor }}>
                        {tt.icon} {tt.label}
                        {recipe && <span className="text-ink-4 ml-1">· {recipe.name}</span>}
                      </p>
                      <p className="text-sm font-serif text-ink truncate">{t.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className="text-[10px] font-light px-1.5 py-0.5"
                        style={{ background: 'rgba(139,111,82,0.1)', color: '#8B6F52' }}
                      >
                        {TASK_STATUS[t.status].label}
                      </span>
                    </div>
                  </div>
                  {progress !== null && (
                    <div>
                      <div className="flex justify-between text-[10px] text-ink-4 font-light mb-1">
                        <span>{fmtDate(t.startDate)} → {fmtDate(t.dueDate)}</span>
                        <span>{progress}%</span>
                      </div>
                      <ProgressBar value={progress} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Recent recipes ────────────────────────────────────── */}
      {recentRecipes.length > 0 && (
        <div className="mb-6">
          <SectionHeader title="近期配方" count={recipes.length} onMore={() => onTabChange('recipe')} />
          <div className="space-y-2">
            {recentRecipes.map((r) => {
              const st = RECIPE_STATUS[r.status];
              return (
                <button
                  key={r.id}
                  onClick={() => onRecipeClick(r.id)}
                  className="w-full text-left border border-border px-4 py-3 hover:border-ink-2 transition-colors"
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor: STATUS_BORDER[r.status],
                    background: STATUS_BG[r.status],
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-ink-2 tracking-label mb-0.5">
                        {r.num} · {FRAG_CATS[r.fragCat].label}
                      </p>
                      <p className="text-sm font-serif text-ink truncate">{r.name}</p>
                      {r.tags.length > 0 && (
                        <p className="text-[10px] text-ink-3 font-light mt-0.5">{r.tags.join(' · ')}</p>
                      )}
                    </div>
                    <span
                      className="text-[10px] font-light px-1.5 py-0.5 border shrink-0"
                      style={{ borderColor: st.color, color: st.color }}
                    >
                      {st.label}
                    </span>
                  </div>
                  {r.rating > 0 && (
                    <p className="text-[10px] text-accent mt-1">
                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Material overview ─────────────────────────────────── */}
      {materials.length > 0 && (
        <div className="mb-6">
          <SectionHeader title="材料庫概況" count={materials.length} onMore={() => onTabChange('material')} />
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(ING_CATS) as (keyof typeof ING_CATS)[]).map((cat) => {
              const count = matByCat[cat] ?? 0;
              if (count === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => onTabChange('material')}
                  className="flex items-center justify-between bg-card border border-border px-3 py-2 hover:border-ink-2 transition-colors"
                >
                  <p className="text-xs text-ink-2 font-light">{ING_CATS[cat].label}</p>
                  <p className="font-serif text-sm text-accent">{count}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Latest notes ──────────────────────────────────────── */}
      {notes.length > 0 && (
        <div className="mb-6">
          <SectionHeader title="最新隨手記" count={notes.length} onMore={() => onTabChange('notes')} />
          <div className="space-y-2">
            {notes.slice(0, 2).map((n) => {
              const { date, time } = formatNoteDate(n.ts);
              return (
                <button
                  key={n.id}
                  onClick={() => onTabChange('notes')}
                  className="w-full text-left bg-card border border-border px-4 py-3 hover:border-ink-2 transition-colors"
                >
                  <p className="text-[10px] text-ink-2 mb-1">
                    <span className="font-normal text-ink">{date}</span> {time}
                  </p>
                  <p className="text-sm font-light text-ink line-clamp-2">{n.text}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {recipes.length === 0 && tasks.length === 0 && materials.length === 0 && (
        <div className="text-center py-16">
          <p className="font-serif text-2xl text-ink-4 mb-3">引香筆記</p>
          <p className="text-sm text-ink-3 font-light">從下方選單開始新增配方或工序</p>
        </div>
      )}
    </div>
  );
}

// ── Section header helper ──────────────────────────────────────────
function SectionHeader({
  title,
  count,
  color,
  onMore,
}: {
  title: string;
  count: number;
  color?: string;
  onMore: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <p className="section-label" style={color ? { color } : undefined}>{title}</p>
        <span
          className="text-[10px] font-light px-1.5 leading-5"
          style={{
            background: color ? `${color}18` : 'rgba(107,100,89,0.1)',
            color: color ?? '#6B6459',
          }}
        >
          {count}
        </span>
      </div>
      <button onClick={onMore} className="text-[11px] text-ink-2 font-light hover:text-ink">全部 →</button>
    </div>
  );
}
