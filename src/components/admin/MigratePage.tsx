/**
 * SINUS NOTE v2.1 — Phase 2 Step 5：配方鬼影逐筆對應
 *
 * 此頁面只在 phase2_materials_upsert.sql 跑完後使用一次。
 * 走訪所有 recipe.versions[].ingredients，對沒有 materialId 的鬼影逐筆
 * 跳出確認對話框，不批次自動處理（規格 7.5 強制要求）。
 *
 * 進度自動寫入 localStorage，可中途離開恢復。
 */

import { useEffect, useMemo, useState } from 'react';
import { sb } from '../../lib/supabase';
import type { Material, Recipe } from '../../types';

// ── Types ──────────────────────────────────────────────────────────
interface GhostRef {
  recipeId: number;
  recipeName: string;
  recipeNum: string;
  versionIdx: number;
  versionLabel: string;
  ingredientIdx: number;
  ingredientName: string;
  ingredientCat: string;
  amount: number;
  unit: string;
}

interface Candidate {
  material: Material;
  score: number;
  reason: string;
}

type Decision =
  | { kind: 'matched'; materialId: string; addToAliases: boolean }
  | { kind: 'skipped' }
  | { kind: 'unresolved' };  // 預設

const STORAGE_KEY = 'sinus_v2_1_migrate_progress';

// ── Helpers ────────────────────────────────────────────────────────
function buildGhostList(recipes: Recipe[]): GhostRef[] {
  const ghosts: GhostRef[] = [];
  for (const r of recipes) {
    for (let vi = 0; vi < (r.versions ?? []).length; vi++) {
      const v = r.versions[vi];
      for (let ii = 0; ii < (v.ingredients ?? []).length; ii++) {
        const ing = v.ingredients[ii];
        if (ing.materialId) continue;  // 已對應，跳過
        ghosts.push({
          recipeId: r.id,
          recipeName: r.name,
          recipeNum: r.num,
          versionIdx: vi,
          versionLabel: v.label,
          ingredientIdx: ii,
          ingredientName: ing.name,
          ingredientCat: ing.cat,
          amount: ing.amount,
          unit: ing.unit,
        });
      }
    }
  }
  return ghosts;
}

function scoreCandidate(ghost: GhostRef, mat: Material): { score: number; reason: string } | null {
  const gname = (ghost.ingredientName || '').trim();
  const mname = (mat.name || '').trim();
  if (!gname) return null;

  // 1. 完全相符
  if (gname === mname) return { score: 100, reason: 'name 完全相符' };

  // 2. aliases 完全相符
  for (const a of mat.aliases ?? []) {
    if (a.trim() === gname) return { score: 95, reason: `alias 命中 "${a}"` };
  }

  // 3. 三段式 name 第一段（品名）相符
  const matFirstSeg = mname.split('｜')[0]?.trim() ?? '';
  if (matFirstSeg && matFirstSeg === gname) {
    return { score: 90, reason: `三段式品名段相符 "${matFirstSeg}"` };
  }

  // 4. 雙向子字串
  if (mname.includes(gname) || gname.includes(mname)) {
    return { score: 70, reason: 'name 子字串相關' };
  }
  if (matFirstSeg && (matFirstSeg.includes(gname) || gname.includes(matFirstSeg))) {
    return { score: 65, reason: '品名段子字串相關' };
  }

  // 5. alias 子字串
  for (const a of mat.aliases ?? []) {
    if (a.includes(gname) || gname.includes(a)) {
      return { score: 55, reason: `alias 子字串 "${a}"` };
    }
  }

  return null;
}

function findCandidates(ghost: GhostRef, materials: Material[]): Candidate[] {
  const cands: Candidate[] = [];
  for (const m of materials) {
    const s = scoreCandidate(ghost, m);
    if (!s) continue;
    let score = s.score;
    // 同 cat 加分
    if (m.cat === ghost.ingredientCat) score += 5;
    cands.push({ material: m, score, reason: s.reason });
  }
  cands.sort((a, b) => b.score - a.score);
  return cands.slice(0, 5);
}

// ── Component ──────────────────────────────────────────────────────
export function MigratePage({ onExit }: { onExit: () => void }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [ghosts, setGhosts] = useState<GhostRef[]>([]);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [cursor, setCursor] = useState(0);

  // ── Initial load ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await sb.auth.getUser();
        if (!user) {
          setError('未登入。請先回首頁登入再開此頁。');
          setLoading(false);
          return;
        }
        setUserId(user.id);

        const [rRes, mRes] = await Promise.all([
          sb.from('recipes').select('*').eq('user_id', user.id).order('id'),
          sb.from('materials').select('*').eq('user_id', user.id).order('id'),
        ]);
        if (rRes.error) throw rRes.error;
        if (mRes.error) throw mRes.error;

        // 直接把 supabase row 餵進來 — supabase.ts 的 rowToRecipe 已會做轉換
        // 為了避免重複實作，這裡用 inline 轉換（snake_case → camelCase）
        const recipeRows = (rRes.data ?? []).map((row) => ({
          id: row.id,
          num: row.num,
          name: row.name,
          fragCat: row.frag_cat,
          status: row.status,
          rating: row.rating,
          tags: row.tags ?? [],
          process: row.process ?? {},
          timeline: row.timeline ?? {},
          versions: row.versions ?? [],
          burnLog: row.burn_log ?? [],
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })) as unknown as Recipe[];

        const matRows = (mRes.data ?? []).map((row) => ({
          id: row.id,
          cat: row.cat,
          name: row.name,
          origin: row.origin,
          supplier: row.supplier,
          note: row.note,
          stock: row.stock ?? { qty: 0, unit: 'g', note: '' },
          displayShort: row.display_short ?? undefined,
          species: row.species ?? undefined,
          speciesGroup: row.species_group ?? undefined,
          grade: row.grade ?? undefined,
          aliases: row.aliases ?? undefined,
          v3Warnings: row.v3_warnings ?? undefined,
          hardCeiling: row.hard_ceiling ?? undefined,
          testStatus: row.test_status ?? undefined,
        })) as unknown as Material[];

        setRecipes(recipeRows);
        setMaterials(matRows);
        setGhosts(buildGhostList(recipeRows));

        // 還原進度
        try {
          const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
          if (saved.decisions) setDecisions(saved.decisions);
          if (typeof saved.cursor === 'number') setCursor(saved.cursor);
        } catch { /* ignore */ }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 進度持久化
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cursor, decisions }));
  }, [cursor, decisions]);

  const ghostKey = (g: GhostRef) =>
    `${g.recipeId}|${g.versionIdx}|${g.ingredientIdx}`;

  const current = ghosts[cursor];
  const candidates = useMemo(
    () => current ? findCandidates(current, materials) : [],
    [current, materials],
  );

  const counts = useMemo(() => {
    let matched = 0, skipped = 0, unresolved = 0;
    for (const g of ghosts) {
      const d = decisions[ghostKey(g)];
      if (!d) { unresolved++; continue; }
      if (d.kind === 'matched') matched++;
      else if (d.kind === 'skipped') skipped++;
      else unresolved++;
    }
    return { matched, skipped, unresolved };
  }, [ghosts, decisions]);

  // ── Decision handlers ──────────────────────────────────────────
  const [pickedMid, setPickedMid] = useState<string>('');
  const [addAlias, setAddAlias] = useState(true);

  // 跳到下一個未決定的鬼影
  function nextCursor(from: number) {
    for (let i = from; i < ghosts.length; i++) {
      const d = decisions[ghostKey(ghosts[i])];
      if (!d || d.kind === 'unresolved') return i;
    }
    return ghosts.length;  // 全部完成
  }

  // 切換到 cursor 時更新 pickedMid 為候選首位
  useEffect(() => {
    if (current) {
      setPickedMid(candidates[0]?.material.id ?? '');
      setAddAlias(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 僅在切換鬼影時重置選擇，candidates 隨 current 派生
  }, [cursor, current?.recipeId, current?.versionIdx, current?.ingredientIdx]);

  async function applyMatched() {
    if (!current || !pickedMid) return;
    const mat = materials.find((m) => m.id === pickedMid);
    if (!mat) return;

    // 1. 寫回 recipe 的 ingredient.materialId
    const recipe = recipes.find((r) => r.id === current.recipeId);
    if (!recipe) return;
    const newVersions = recipe.versions.map((v, vi) => {
      if (vi !== current.versionIdx) return v;
      return {
        ...v,
        ingredients: v.ingredients.map((ing, ii) => {
          if (ii !== current.ingredientIdx) return ing;
          return { ...ing, materialId: pickedMid };
        }),
      };
    });

    const { error: rErr } = await sb
      .from('recipes')
      .update({ versions: newVersions, updated_at: new Date().toISOString() })
      .eq('id', current.recipeId)
      .eq('user_id', userId!);
    if (rErr) { setError(`寫入配方失敗: ${rErr.message}`); return; }

    // 2. 可選：把 ghost name 加入 material aliases
    if (addAlias && !(mat.aliases ?? []).includes(current.ingredientName)) {
      const newAliases = [...(mat.aliases ?? []), current.ingredientName];
      const { error: mErr } = await sb
        .from('materials')
        .update({ aliases: newAliases, updated_at: new Date().toISOString() })
        .eq('id', pickedMid)
        .eq('user_id', userId!);
      if (mErr) { setError(`寫入材料 aliases 失敗: ${mErr.message}`); return; }
      setMaterials((prev) => prev.map((m) => m.id === pickedMid ? { ...m, aliases: newAliases } : m));
    }

    // 3. local state 更新
    setRecipes((prev) => prev.map((r) => r.id === current.recipeId ? { ...r, versions: newVersions } : r));
    setDecisions((prev) => ({
      ...prev,
      [ghostKey(current)]: { kind: 'matched', materialId: pickedMid, addToAliases: addAlias },
    }));
    setCursor(nextCursor(cursor + 1));
  }

  function applySkipped() {
    if (!current) return;
    setDecisions((prev) => ({ ...prev, [ghostKey(current)]: { kind: 'skipped' } }));
    setCursor(nextCursor(cursor + 1));
  }

  function goBack() {
    // 倒退到上一個（任何狀態）
    if (cursor > 0) setCursor(cursor - 1);
  }

  function resetProgress() {
    if (!confirm('確定清空所有進度？已寫入資料庫的對應不會回滾。')) return;
    localStorage.removeItem(STORAGE_KEY);
    setDecisions({});
    setCursor(0);
  }

  // ── Export post-migration JSON ──────────────────────────────────
  function exportSnapshot() {
    const blob = new Blob([JSON.stringify({
      exportedAt: new Date().toISOString(),
      phase: 'post-v2.1-migration',
      recipes,
      materials,
      decisions,
    }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sinus-note-backup-post-migration-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ── Render ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <p className="type-meta tracking-label">遷移工具載入中…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-bg p-8 max-w-content mx-auto">
      <h1 className="type-title mb-4">遷移工具錯誤</h1>
      <p className="type-body text-error mb-6">{error}</p>
      <button onClick={onExit} className="btn">回首頁</button>
    </div>
  );

  // 全部處理完
  if (cursor >= ghosts.length) {
    return (
      <div className="min-h-screen bg-bg p-8 max-w-content mx-auto">
        <h1 className="type-title mb-2">Phase 2 Step 5 完成</h1>
        <p className="type-meta tracking-label mb-6">配方鬼影對應全部處理完畢</p>
        <div className="border border-border bg-card p-6 mb-6 space-y-2">
          <p className="type-body">總鬼影：{ghosts.length}</p>
          <p className="type-body">已對應：{counts.matched}</p>
          <p className="type-body">已略過：{counts.skipped}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportSnapshot} className="btn-primary text-xs">下載 post-migration 備份</button>
          <button onClick={resetProgress} className="btn text-xs">重置進度</button>
          <button onClick={onExit} className="btn text-xs">回首頁</button>
        </div>
      </div>
    );
  }

  // 沒有鬼影（所有 ingredient 都已有 materialId）
  if (ghosts.length === 0) {
    return (
      <div className="min-h-screen bg-bg p-8 max-w-content mx-auto">
        <h1 className="type-title mb-4">沒有需要對應的鬼影</h1>
        <p className="type-body mb-6">所有配方 ingredient 都已有 materialId。</p>
        <button onClick={onExit} className="btn">回首頁</button>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="min-h-screen bg-bg p-4 md:p-8 max-w-content mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="type-meta tracking-label">Phase 2 Step 5 — 鬼影對應</p>
        <h1 className="type-title">{cursor + 1} / {ghosts.length}</h1>
        <p className="type-meta mt-1">
          已對應 {counts.matched} · 略過 {counts.skipped} · 未決 {counts.unresolved}
        </p>
      </div>

      {/* Recipe context */}
      <div className="border border-border bg-card p-4 mb-4">
        <p className="type-meta tracking-label mb-1">在配方</p>
        <p className="type-name">{current.recipeNum} · {current.recipeName}</p>
        <p className="type-meta mt-1">版本：{current.versionLabel}</p>
        <p className="type-meta">中發現未對應的材料：</p>
        <p className="type-name mt-2 text-accent">「{current.ingredientName}」</p>
        <p className="type-meta mt-1">
          類別：{current.ingredientCat} · 份量：{current.amount}{current.unit}
        </p>
      </div>

      {/* Candidates */}
      <div className="border border-border bg-card p-4 mb-4">
        <p className="type-meta tracking-label mb-3">系統推測可能對應到</p>
        {candidates.length === 0 && (
          <p className="type-body text-ink-2">沒有候選 — 建議「略過」此筆等之後手動處理。</p>
        )}
        <div className="space-y-2">
          {candidates.map((c) => (
            <label key={c.material.id} className="flex items-start gap-3 cursor-pointer p-2 border border-transparent hover:border-border">
              <input
                type="radio"
                name="cand"
                value={c.material.id}
                checked={pickedMid === c.material.id}
                onChange={() => setPickedMid(c.material.id)}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <p className="type-body">
                  <span className="text-ink-2 mr-2">{c.material.id}</span>
                  {c.material.name}
                </p>
                <p className="type-meta text-ink-2">
                  {c.material.species ?? ''} · {c.material.speciesGroup ?? ''} · score {c.score} · {c.reason}
                </p>
              </div>
            </label>
          ))}
        </div>

        {candidates.length > 0 && (
          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={addAlias}
              onChange={(e) => setAddAlias(e.target.checked)}
            />
            <span className="type-meta">將「{current.ingredientName}」加入該材料 aliases，未來自動套用</span>
          </label>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={applyMatched}
          disabled={!pickedMid || candidates.length === 0}
          className="btn-primary text-xs disabled:opacity-30 disabled:cursor-not-allowed"
        >
          確認對應
        </button>
        <button onClick={applySkipped} className="btn text-xs">略過此筆</button>
        <button onClick={goBack} disabled={cursor === 0} className="btn text-xs disabled:opacity-30">
          ← 上一筆
        </button>
        <div className="flex-1" />
        <button onClick={resetProgress} className="btn text-xs text-ink-2">重置進度</button>
        <button onClick={onExit} className="btn text-xs">退出（保存進度）</button>
      </div>
    </div>
  );
}
