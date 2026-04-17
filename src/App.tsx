import { useState } from 'react';
import { useAuth } from './hooks/supabase/useAuth';
import { useRecipes } from './hooks/supabase/useRecipes';
import { useMaterials } from './hooks/supabase/useMaterials';
import { useTasks } from './hooks/supabase/useTasks';
import { useNotes } from './hooks/supabase/useNotes';

import { LoginScreen } from './components/auth/LoginScreen';
import { BottomNav, type TabId } from './components/nav/BottomNav';
import { MenuOverlay } from './components/nav/MenuOverlay';

import { Dashboard } from './components/dashboard/Dashboard';
import { RecipeHome } from './components/recipe/RecipeHome';
import { RecipeCategory } from './components/recipe/RecipeCategory';
import { RecipeDetail } from './components/recipe/RecipeDetail';
import { RecipeForm } from './components/recipe/RecipeForm';

import { TaskDashboard } from './components/task/TaskDashboard';
import { MaterialList } from './components/material/MaterialList';
import { NotesList } from './components/notes/NotesList';
import { ConfirmDialog } from './components/shared/ConfirmDialog';
import { useToast } from './components/shared/Toast';

import { exportBackup, readJsonFile, mergePatch, type BackupData } from './utils/export';
import { MOCK_RECIPES, MOCK_TASKS, MOCK_MATERIALS, MOCK_NOTES } from './utils/mockData';
import { TASK_TYPES } from './utils/constants';
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

  // Recipe navigation
  const [recipeScreen, setRecipeScreen] = useState<RecipeScreen>('home');
  const [activeCat, setActiveCat] = useState<FragCat>('test');
  const [activeRecipeId, setActiveRecipeId] = useState<number | null>(null);
  const [editRecipe, setEditRecipe] = useState<Recipe | null>(null);
  const [newRecipeForCat, setNewRecipeForCat] = useState<FragCat | undefined>();

  // Confirmation state (import / delete recipe)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [pendingDeleteRecipe, setPendingDeleteRecipe] = useState<Recipe | null>(null);

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

  // ── Mock data fallback when store is empty ─────────────────────
  const dataLoaded = !recipeStore.loading && !matStore.loading && !taskStore.loading && !noteStore.loading;
  const isMock = dataLoaded &&
    recipeStore.recipes.length === 0 &&
    matStore.materials.length === 0 &&
    taskStore.tasks.length === 0;

  const recipes  = isMock ? MOCK_RECIPES  : recipeStore.recipes;
  const tasks    = isMock ? MOCK_TASKS    : taskStore.tasks;
  const materials = isMock ? MOCK_MATERIALS : matStore.materials;
  const notes    = isMock ? MOCK_NOTES    : noteStore.notes;

  // alertTasks computed from effective tasks
  const alertTasks = tasks.filter((t) => {
    if (t.status === 'done') return false;
    const tt = TASK_TYPES[t.taskType];
    if (tt.defaultDays === 0) return true;
    if (!t.dueDate) return false;
    const days = Math.round((new Date(t.dueDate).getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
    return days <= 3;
  });

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
    try {
      await recipeStore.deleteRecipe(id);
      toast.success('配方已刪除');
      setRecipeScreen('category');
    } catch (err) {
      toast.error(`刪除失敗：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function handleBurnSave(_taskId: string, recipeId: number | null, entry: BurnEntry) {
    if (recipeId) {
      const recipe = recipeStore.recipes.find((r) => r.id === recipeId);
      if (recipe) {
        await recipeStore.updateRecipe(recipeId, { burnLog: [...(recipe.burnLog ?? []), entry] });
      }
    }
  }

  async function handleUpdateStock(name: string, qty: number, unit: string) {
    const mat = matStore.materials.find((m) => m.name === name);
    if (mat) await matStore.updateMaterial(mat.id, { stock: { ...mat.stock, qty, unit } });
  }

  async function handleAddRecipeNote(recipeId: number, note: string) {
    const recipe = recipeStore.recipes.find((r) => r.id === recipeId);
    if (!recipe) return;
    await recipeStore.updateRecipe(recipeId, {
      versions: recipe.versions.map((ver, i) =>
        i === 0 ? { ...ver, notes: ver.notes ? `${ver.notes}\n\n${note}` : note } : ver,
      ),
    });
  }

  async function handleAddMaterial(mat: Omit<Material, 'id'>): Promise<void> {
    await matStore.addMaterial(mat);
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
        await recipeStore.saveRecipes(data.recipes ?? [], data.nextId, data.catOrder ?? null);
        if (data.catImages) await recipeStore.saveCatImages(data.catImages);
        if (data.materials) await matStore.saveMaterials(data.materials);
        if (data.tasks) await taskStore.saveTasks(data.tasks);
        toast.success('匯入完成');
      } else {
        const patch = req.patch;
        const merged = mergePatch(
          { recipes: recipeStore.recipes, materials: matStore.materials, tasks: taskStore.tasks },
          { recipes: patch.recipes, materials: patch.materials, tasks: patch.tasks },
        );
        await recipeStore.saveRecipes(merged.recipes);
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
          onTaskClick={() => setTab('task')}
          onAddMaterial={handleAddMaterial}
          onUpdateStock={handleUpdateStock}
          onAddRecipe={handleAddRecipe}
          onAddRecipeNote={handleAddRecipeNote}
          onAddTask={async (data) => { await taskStore.addTask(data); }}
          suppressSync={noteStore.suppressSync}
        />
      );
    }

    if (tab === 'recipe') {
      if (recipeScreen === 'form') {
        return (
          <RecipeForm
            initial={editRecipe ?? undefined}
            nextId={recipeStore.nextId}
            materialNames={matStore.materialNames}
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
            onBack={goRecipeBack}
            onEdit={(r) => goRecipeForm(r)}
            onDelete={() => setPendingDeleteRecipe(recipe)}
            onTaskTab={() => setTab('task')}
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
          tasks={isMock ? MOCK_TASKS : taskStore.tasks}
          alertTasks={alertTasks}
          recipes={recipes}
          materialNames={matStore.materialNames}
          onAdd={async (data) => { await taskStore.addTask(data); }}
          onUpdate={taskStore.updateTask}
          onDelete={taskStore.deleteTask}
          onRecipeClick={(id) => { goRecipeDetail(id); }}
          onBurnSave={handleBurnSave}
        />
      );
    }

    if (tab === 'material') {
      return (
        <MaterialList
          materials={isMock ? MOCK_MATERIALS : matStore.materials}
          onAdd={handleAddMaterial}
          onUpdate={matStore.updateMaterial}
          onDelete={matStore.deleteMaterial}
        />
      );
    }

    if (tab === 'notes') {
      return (
        <NotesList
          notes={isMock ? MOCK_NOTES : noteStore.notes}
          onAdd={async (text) => { await noteStore.addNote(text); }}
          onUpdate={noteStore.updateNote}
          onDelete={noteStore.deleteNote}
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
        onSaveCatImage={async (catId, base64) => {
          await recipeStore.saveCatImages({ ...recipeStore.catImagesMap, [catId]: base64 });
        }}
        onSaveCatOrder={async (order: FragCat[]) => {
          await recipeStore.saveRecipes(recipeStore.recipes, undefined, order);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg">
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
        }}
        onMenuOpen={() => setMenuOpen(true)}
      />
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
