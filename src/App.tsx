import { lazy, Suspense, useEffect, useState } from 'react';
import { useAuth } from './hooks/supabase/useAuth';
import { useRecipes } from './hooks/supabase/useRecipes';
import { useMaterials } from './hooks/supabase/useMaterials';
import { useTasks, isAlertTask } from './hooks/supabase/useTasks';
import { useNotes } from './hooks/supabase/useNotes';

import { LoginScreen } from './components/auth/LoginScreen';
import { BottomNav, type TabId } from './components/nav/BottomNav';
import { MenuOverlay } from './components/nav/MenuOverlay';

// 一次性遷移工具 — lazy load，不要進主 bundle
const MigratePage = lazy(() =>
  import('./components/admin/MigratePage').then((m) => ({ default: m.MigratePage })),
);

import { Dashboard } from './components/dashboard/Dashboard';
import { RecipeHome } from './components/recipe/RecipeHome';
import { RecipeCategory } from './components/recipe/RecipeCategory';
import { RecipeDetail } from './components/recipe/RecipeDetail';
import { RecipeForm } from './components/recipe/RecipeForm';

import { TaskDashboard } from './components/task/TaskDashboard';
import { MaterialList } from './components/material/MaterialList';
import { NotesList } from './components/notes/NotesList';
import { ConfirmDialog } from './components/shared/ConfirmDialog';
import { QuickNoteSheet } from './components/shared/QuickNoteSheet';
import { useToast } from './components/shared/useToast';
import { OfflineBanner } from './components/shared/OfflineBanner';

import { exportBackup, readJsonFile, mergePatch, type BackupData } from './utils/export';
import { BACKUP_KEY } from './utils/backup';
import { todayISO } from './utils/date';
import { MOCK_RECIPES, MOCK_TASKS, MOCK_MATERIALS, MOCK_NOTES } from './utils/mockData';
import type { Recipe, FragCat, BurnEntry, Material } from './types';

type PendingImport =
  | { kind: 'replace'; data: BackupData }
  | { kind: 'merge'; patch: Partial<BackupData> };

type RecipeScreen = 'home' | 'category' | 'detail' | 'form';

export default function App() {
  const { user, loading, error, login, logout } = useAuth();
  const uid = user?.uid ?? null;
  const toast = useToast();

  const recipeStore = useRecipes(uid);
  const matStore = useMaterials(uid);
  const taskStore = useTasks(uid);
  const noteStore = useNotes(uid);

  const [tab, setTab] = useState<TabId>('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  // 全域搜尋跳轉：帶入目標分頁的初始搜尋詞
  const [matSeed, setMatSeed] = useState<string | null>(null);
  const [noteSeed, setNoteSeed] = useState<string | null>(null);

  // Recipe navigation
  const [recipeScreen, setRecipeScreen] = useState<RecipeScreen>('home');
  const [activeCat, setActiveCat] = useState<FragCat>('test');
  const [activeRecipeId, setActiveRecipeId] = useState<number | null>(null);
  const [editRecipe, setEditRecipe] = useState<Recipe | null>(null);
  const [newRecipeForCat, setNewRecipeForCat] = useState<FragCat | undefined>();

  // Confirmation state (import / delete recipe)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [pendingDeleteRecipe, setPendingDeleteRecipe] = useState<Recipe | null>(null);

  // ── 讀取錯誤統一呈現（寫入錯誤由各呼叫端 catch + toast）──────────
  const storeError = recipeStore.error ?? matStore.error ?? taskStore.error ?? noteStore.error;
  useEffect(() => {
    if (storeError) toast.error(storeError);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast api 為穩定 context
  }, [storeError]);

  // ── PWA 捷徑深連結（?quick=note / ?quick=task）─────────────────
  useEffect(() => {
    if (!user) return;
    const q = new URLSearchParams(window.location.search).get('quick');
    if (!q) return;
    if (q === 'note') setQuickNoteOpen(true);
    if (q === 'task') setTab('task');
    window.history.replaceState(null, '', window.location.pathname);
  }, [user]);

  if (loading) {
    return (
      <div
        className="min-h-screen bg-bg flex flex-col items-center justify-center gap-3"
        role="status"
        aria-live="polite"
        aria-label="載入中"
      >
        <p className="font-serif text-2xl text-ink tracking-wide">SINUS NOTE</p>
        <p className="text-xs text-ink-3 font-light tracking-label">載入中…</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={login} error={error} />;
  }

  // ── v2.1 Migration tool ─────────────────────────────────────────
  // 走訪 window.location.pathname 而非 React Router（專案沒裝）。
  // 跑完 Phase 2 Step 5 後此頁就用不到了，可直接移除。
  if (typeof window !== 'undefined' && window.location.pathname === '/admin/migrate') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-bg flex items-center justify-center"><p className="type-meta tracking-label">遷移工具載入中…</p></div>}>
        <MigratePage
          onExit={() => {
            window.history.replaceState(null, '', '/');
            // 重新整理回到正常 app
            window.location.reload();
          }}
        />
      </Suspense>
    );
  }

  // ── 資料載入中：先擋住，避免「空資料/示範資料」閃現誤導 ─────────
  const dataLoaded = !recipeStore.loading && !matStore.loading && !taskStore.loading && !noteStore.loading;
  if (!dataLoaded) {
    return (
      <div
        className="min-h-screen bg-bg flex flex-col items-center justify-center gap-3"
        role="status"
        aria-live="polite"
        aria-label="資料載入中"
      >
        <p className="font-serif text-2xl text-ink tracking-wide">SINUS NOTE</p>
        <p className="text-xs text-ink-3 font-light tracking-label">資料載入中…</p>
      </div>
    );
  }

  // ── Mock data fallback when store is completely empty ──────────
  // 注意：四個 store（含 notes）都空才進 mock，
  // 否則「只記過隨手記」的帳號會被假資料蓋掉真資料。
  const isMock =
    recipeStore.recipes.length === 0 &&
    matStore.materials.length === 0 &&
    taskStore.tasks.length === 0 &&
    noteStore.notes.length === 0;

  const recipes  = isMock ? MOCK_RECIPES  : recipeStore.recipes;
  const tasks    = isMock ? MOCK_TASKS    : taskStore.tasks;
  const materials = isMock ? MOCK_MATERIALS : matStore.materials;
  const notes    = isMock ? MOCK_NOTES    : noteStore.notes;

  const alertTasks = tasks.filter(isAlertTask);

  // 示範資料只能看不能改；新增操作維持可用（寫入第一筆真資料後自動退出示範模式）
  const MOCK_BLOCK_MSG = '目前顯示的是示範資料，無法編輯或刪除 — 新增第一筆自己的資料後就會切換';
  // 用 throw 而非靜默 return：呼叫端（刪除確認、表單）才不會接著顯示「已完成」的成功回饋
  function mockGuard<A extends unknown[]>(fn: (...args: A) => void | Promise<void>) {
    return async (...args: A) => {
      if (isMock) throw new Error(MOCK_BLOCK_MSG);
      await fn(...args);
    };
  }

  // ── Recipe navigation helpers ─────────────────────────────────
  function goRecipeCat(cat: FragCat) {
    setActiveCat(cat);
    setRecipeScreen('category');
    setTab('recipe');
  }

  function goRecipeDetail(id: number) {
    setActiveRecipeId(id);
    setRecipeScreen('detail');
    setTab('recipe');
  }

  function goRecipeForm(recipe?: Recipe, forCat?: FragCat) {
    if (recipe && isMock) { toast.info(MOCK_BLOCK_MSG); return; }
    setEditRecipe(recipe ?? null);
    setNewRecipeForCat(forCat);
    setRecipeScreen('form');
  }

  function goRecipeBack() {
    if (recipeScreen === 'detail' || recipeScreen === 'form') {
      setRecipeScreen('category');
    } else {
      setRecipeScreen('home');
    }
  }

  // ── Recipe CRUD ───────────────────────────────────────────────
  async function handleAddRecipe(data: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) {
    const r = await recipeStore.addRecipe(data);
    setActiveRecipeId(r.id);
    setRecipeScreen('detail');
  }

  async function handleUpdateRecipe(data: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) {
    if (!editRecipe) return;
    await recipeStore.updateRecipe(editRecipe.id, data);
    setRecipeScreen('detail');
  }

  async function handleDeleteRecipe(id: number) {
    const recipe = recipeStore.recipes.find((r) => r.id === id);
    if (!recipe) return;
    try {
      await recipeStore.deleteRecipe(id);
      setRecipeScreen('category');
      toast.success('配方已刪除', {
        action: {
          label: '復原',
          onClick: async () => {
            try {
              await recipeStore.restoreRecipe(recipe);
              toast.info('配方已復原');
            } catch (err) {
              toast.error(`復原失敗：${err instanceof Error ? err.message : String(err)}`);
            }
          },
        },
      });
    } catch (err) {
      toast.error(`刪除失敗：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function handleBurnSave(taskId: string, recipeId: number | null, entry: BurnEntry) {
    const recipe = recipeId != null ? recipeStore.recipes.find((r) => r.id === recipeId) : undefined;
    if (recipe) {
      await recipeStore.updateRecipe(recipe.id, { burnLog: [...(recipe.burnLog ?? []), entry] });
      return;
    }
    // 沒有關聯配方（或配方已被刪除）→ 把結果寫進工序備註，不讓紀錄消失
    const task = taskStore.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const summary =
      `[${entry.date} 試燒] 前:${entry.front || '—'}｜中:${entry.mid || '—'}｜後:${entry.tail || '—'}` +
      `｜煙:${entry.smoke === 'good' ? '優' : entry.smoke === 'bad' ? '差' : '可'}｜評分:${entry.rating}/5` +
      (entry.notes ? `｜${entry.notes}` : '');
    await taskStore.updateTask(taskId, { notes: task.notes ? `${task.notes}\n${summary}` : summary });
  }

  async function handleUpdateStock(name: string, qty: number, unit: string) {
    const mat = matStore.materials.find((m) => m.name === name);
    if (!mat) throw new Error(`材料庫找不到「${name}」，請先新增材料`);
    await matStore.updateMaterial(mat.id, { stock: { ...mat.stock, qty, unit } });
  }

  async function handleAddRecipeNote(recipeId: number, note: string) {
    const recipe = recipeStore.recipes.find((r) => r.id === recipeId);
    if (!recipe) throw new Error('找不到對應配方，備註未寫入');
    await recipeStore.updateRecipe(recipeId, {
      versions: recipe.versions.map((ver, i) =>
        i === 0 ? { ...ver, notes: ver.notes ? `${ver.notes}\n\n${note}` : note } : ver,
      ),
    });
  }

  async function handleAddMaterial(mat: Omit<Material, 'id'>): Promise<Material> {
    return await matStore.addMaterial(mat);
  }

  // ── Export / Import ───────────────────────────────────────────
  function handleExport() {
    exportBackup({
      exportedAt: new Date().toISOString(),
      recipes: recipeStore.recipes,
      nextId: recipeStore.nextId,
      catImages: recipeStore.catImagesMap,
      catOrder: recipeStore.catOrder,
      materials: matStore.materials,
      tasks: taskStore.tasks,
    });
    localStorage.setItem(BACKUP_KEY, new Date().toISOString());
    setMenuOpen(false);
  }

  async function handleImport(file: File) {
    try {
      const data = await readJsonFile(file) as BackupData;
      setMenuOpen(false);
      setPendingImport({ kind: 'replace', data });
    } catch (err) {
      toast.error(`讀取檔案失敗：${err instanceof Error ? err.message : String(err)}`);
      setMenuOpen(false);
    }
  }

  async function handleMergeImport(file: File) {
    try {
      const patch = await readJsonFile(file) as Partial<BackupData>;
      setMenuOpen(false);
      setPendingImport({ kind: 'merge', patch });
    } catch (err) {
      toast.error(`讀取檔案失敗：${err instanceof Error ? err.message : String(err)}`);
      setMenuOpen(false);
    }
  }

  async function confirmImport() {
    if (!pendingImport) return;
    const req = pendingImport;
    setPendingImport(null);
    try {
      if (req.kind === 'replace') {
        const data = req.data;
        const importedRecipes = data.recipes ?? [];
        // nextId 校正：舊備份可能缺 nextId 或小於資料內最大 id，會導致之後撞號
        const maxId = importedRecipes.reduce((mx, r) => Math.max(mx, r.id), 0);
        const nextId = Math.max(data.nextId ?? 200, maxId + 1);
        await recipeStore.saveRecipes(importedRecipes, nextId, data.catOrder ?? null);
        if (data.catImages) await recipeStore.saveCatImages(data.catImages);
        if (data.materials) await matStore.saveMaterials(data.materials);
        if (data.tasks) await taskStore.saveTasks(data.tasks);
        toast.success('匯入完成');
      } else {
        const patch = req.patch;
        const merged = mergePatch(
          { recipes: recipeStore.recipes, materials: matStore.materials, tasks: taskStore.tasks },
          { recipes: patch.recipes, materials: patch.materials, tasks: patch.tasks },
          recipeStore.nextId,
        );
        await recipeStore.saveRecipes(merged.recipes, merged.nextId);
        await matStore.saveMaterials(merged.materials);
        await taskStore.saveTasks(merged.tasks);
        toast.success(`合併完成：配方 +${merged.added.recipes}、材料 +${merged.added.materials}、工序 +${merged.added.tasks}`);
      }
    } catch (err) {
      toast.error(`${req.kind === 'replace' ? '匯入' : '合併'}失敗：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function importConfirmMessage(req: PendingImport): string {
    if (req.kind === 'replace') {
      const r = req.data.recipes?.length ?? 0;
      const m = req.data.materials?.length ?? 0;
      const t = req.data.tasks?.length ?? 0;
      return `匯入將覆蓋全部資料，無法復原。\n即將匯入：配方 ${r}、材料 ${m}、工序 ${t}。\n確定執行嗎？`;
    }
    const r = req.patch.recipes?.length ?? 0;
    const m = req.patch.materials?.length ?? 0;
    const t = req.patch.tasks?.length ?? 0;
    return `合併匯入將保留既有資料並追加差異項。\n檔案內容：配方 ${r}、材料 ${m}、工序 ${t}。\n確定執行嗎？`;
  }

  // ── Render ────────────────────────────────────────────────────
  function renderTab() {
    if (tab === 'overview') {
      return (
        <Dashboard
          recipes={recipes}
          tasks={tasks}
          materials={materials}
          notes={notes}
          isMock={isMock}
          nextId={recipeStore.nextId}
          onTabChange={(t) => { setTab(t); if (t === 'recipe') setRecipeScreen('home'); }}
          onRecipeClick={goRecipeDetail}
          onMaterialClick={(q) => { setMatSeed(q); setTab('material'); }}
          onNoteClick={(q) => { setNoteSeed(q); setTab('notes'); }}
          onTaskClick={() => setTab('task')}
          onAddMaterial={handleAddMaterial}
          onUpdateStock={handleUpdateStock}
          onAddRecipe={handleAddRecipe}
          onAddRecipeNote={handleAddRecipeNote}
          onAddTask={async (data) => { await taskStore.addTask(data); }}
          onExport={handleExport}
          onMenuOpen={() => setMenuOpen(true)}
        />
      );
    }

    if (tab === 'recipe') {
      if (recipeScreen === 'form') {
        return (
          <RecipeForm
            initial={editRecipe ?? undefined}
            nextId={recipeStore.nextId}
            materials={materials}
            fragCat={newRecipeForCat}
            onSave={editRecipe ? handleUpdateRecipe : handleAddRecipe}
            onCancel={goRecipeBack}
          />
        );
      }
      if (recipeScreen === 'detail' && activeRecipeId != null) {
        const recipe = recipes.find((r) => Number(r.id) === Number(activeRecipeId));
        if (!recipe) return renderRecipeHome();
        return (
          <RecipeDetail
            recipe={recipe}
            tasks={tasks}
            materials={materials}
            onBack={goRecipeBack}
            onEdit={(r) => goRecipeForm(r)}
            onDelete={() => {
              if (isMock) { toast.info(MOCK_BLOCK_MSG); return; }
              setPendingDeleteRecipe(recipe);
            }}
            onTaskTab={() => setTab('task')}
            onCreateWeighTask={async (r, batchWeight) => {
              await taskStore.addTask({
                title: `${r.name} — 稱量配粉`, material: '', recipeId: r.id,
                taskType: 'weigh', status: 'ready', startDate: todayISO(), dueDate: null,
                completedDate: null, notes: batchWeight ? `批次 ${batchWeight}g` : '', checkpoints: [],
              });
            }}
          />
        );
      }
      if (recipeScreen === 'category') {
        return (
          <RecipeCategory
            cat={activeCat}
            recipes={recipes}
            onBack={() => setRecipeScreen('home')}
            onRecipeClick={goRecipeDetail}
            onNew={() => goRecipeForm(undefined, activeCat)}
          />
        );
      }
      return renderRecipeHome();
    }

    if (tab === 'task') {
      return (
        <TaskDashboard
          tasks={tasks}
          alertTasks={alertTasks}
          recipes={recipes}
          materialNames={matStore.materialNames}
          onAdd={async (data) => { await taskStore.addTask(data); }}
          onUpdate={mockGuard(taskStore.updateTask)}
          onDelete={mockGuard(taskStore.deleteTask)}
          onRestore={taskStore.restoreTask}
          onRecipeClick={(id) => { goRecipeDetail(id); }}
          onBurnSave={mockGuard(handleBurnSave)}
        />
      );
    }

    if (tab === 'material') {
      return (
        <MaterialList
          materials={materials}
          initialSearch={matSeed ?? undefined}
          onAdd={handleAddMaterial}
          onUpdate={mockGuard(matStore.updateMaterial)}
          onDelete={mockGuard(matStore.deleteMaterial)}
          onRestore={matStore.restoreMaterial}
        />
      );
    }

    if (tab === 'notes') {
      return (
        <NotesList
          notes={notes}
          initialSearch={noteSeed ?? undefined}
          onAdd={async (text) => { await noteStore.addNote(text); }}
          onUpdate={mockGuard(noteStore.updateNote)}
          onDelete={mockGuard(noteStore.deleteNote)}
          onRestore={noteStore.restoreNote}
        />
      );
    }

    return null;
  }

  function renderRecipeHome() {
    return (
      <RecipeHome
        recipes={recipes}
        catImagesMap={recipeStore.catImagesMap}
        catOrder={recipeStore.catOrder}
        onCatClick={goRecipeCat}
        onRecipeClick={goRecipeDetail}
        onSaveCatImage={async (catId, base64) => {
          try {
            await recipeStore.saveCatImages({ ...recipeStore.catImagesMap, [catId]: base64 });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
          }
        }}
        onSaveCatOrder={async (order: FragCat[]) => {
          try {
            await recipeStore.saveCatOrder(order);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <OfflineBanner />
      <div className="md:pt-12">
        {renderTab()}
        {/* Mobile: extra spacer for bottom nav + iOS safe area */}
        <div className="md:hidden" style={{ height: 'calc(3rem + env(safe-area-inset-bottom))' }} />
      </div>
      <BottomNav
        current={tab}
        onChange={(t) => {
          setTab(t);
          if (t === 'recipe') setRecipeScreen('home');
          // 手動切分頁時清除全域搜尋 seed，避免殘留搜尋詞
          setMatSeed(null);
          setNoteSeed(null);
        }}
        onMenuOpen={() => setMenuOpen(true)}
      />
      {/* 快速記錄浮層：僅由 PWA 捷徑（?quick=note）觸發 — app 內請直接用隨手記分頁 */}
      {quickNoteOpen && (
        <QuickNoteSheet
          onSave={async (t) => { await noteStore.addNote(t); }}
          onClose={() => setQuickNoteOpen(false)}
        />
      )}
      {menuOpen && (
        <MenuOverlay
          onClose={() => setMenuOpen(false)}
          onExport={handleExport}
          onImport={handleImport}
          onMergeImport={handleMergeImport}
          onLogout={async () => { await logout(); setMenuOpen(false); }}
        />
      )}

      {pendingImport && (
        <ConfirmDialog
          message={importConfirmMessage(pendingImport)}
          confirmLabel={pendingImport.kind === 'replace' ? '覆蓋匯入' : '合併匯入'}
          tone={pendingImport.kind === 'replace' ? 'danger' : 'default'}
          onConfirm={confirmImport}
          onCancel={() => setPendingImport(null)}
        />
      )}

      {pendingDeleteRecipe && (
        <ConfirmDialog
          message={`確定要刪除配方「${pendingDeleteRecipe.name}」？\n此操作無法復原。`}
          confirmLabel="刪除"
          tone="danger"
          onConfirm={async () => {
            const target = pendingDeleteRecipe;
            setPendingDeleteRecipe(null);
            await handleDeleteRecipe(target.id);
          }}
          onCancel={() => setPendingDeleteRecipe(null)}
        />
      )}
    </div>
  );
}
