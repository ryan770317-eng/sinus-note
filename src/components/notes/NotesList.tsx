import { useState, useRef } from 'react';
import type { Note, Recipe, Material, Task } from '../../types';
import { formatNoteDate } from '../../utils/date';
import { callClaude, NOTE_ANALYSIS_PROMPT } from '../../services/claude';
import { VoiceInput } from './VoiceInput';
import { BatchImport } from './BatchImport';

const COLLAPSE_THRESHOLD = 120; // chars

interface Props {
  notes: Note[];
  recipes: Recipe[];
  materials: Material[];
  tasks: Task[];
  nextId: number;
  onAdd: (text: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Note>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddMaterial: (mat: Omit<Material, 'id'>) => Promise<void>;
  onUpdateStock: (name: string, qty: number, unit: string) => Promise<void>;
  onAddRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onAddRecipeNote: (recipeId: number, note: string) => Promise<void>;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  suppressSync: (ms?: number) => void;
}

export function NotesList({
  notes,
  recipes,
  materials,
  tasks,
  nextId,
  onAdd,
  onUpdate,
  onDelete,
  onAddMaterial,
  onUpdateStock,
  onAddRecipe,
  onAddRecipeNote,
  onAddTask,
  suppressSync,
}: Props) {
  const [input, setInput] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Suppress unused
  void tasks;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    await onAdd(input.trim());
    setInput('');
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleAnalyze(note: Note) {
    setAnalyzing((prev) => new Set(prev).add(note.id));
    try {
      const result = await callClaude(NOTE_ANALYSIS_PROMPT, note.text);
      await onUpdate(note.id, { aiResult: result });
    } catch (err) {
      alert(`AI 解析失敗：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAnalyzing((prev) => { const n = new Set(prev); n.delete(note.id); return n; });
    }
  }

  function shouldCollapse(note: Note): boolean {
    return note.text.length > COLLAPSE_THRESHOLD || note.text.split('\n').length > 3;
  }

  async function handleUpdateStock(name: string, qty: number, unit: string) {
    await onUpdateStock(name, qty, unit);
  }

  return (
    <div className="max-w-content mx-auto px-4 pt-7 pb-20">
      <h1 className="font-serif text-xl text-ink tracking-wide mb-5">隨手記</h1>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="快速記錄..."
            rows={3}
            className="input-field flex-1 resize-none"
          />
          <div className="flex flex-col gap-2">
            <VoiceInput
              onResult={(text) => {
                setInput((prev) => prev ? `${prev} ${text}` : text);
                textareaRef.current?.focus();
              }}
            />
            <button type="submit" className="btn-primary text-xs px-3 py-2">記錄</button>
          </div>
        </div>
      </form>

      {/* Notes list */}
      <div className="space-y-3">
        {notes.length === 0 && (
          <p className="text-sm text-ink-3 font-light text-center py-8">尚無筆記</p>
        )}
        {notes.map((note) => {
          const { date, time } = formatNoteDate(note.ts);
          const collapsible = shouldCollapse(note);
          const isExpanded = expanded.has(note.id);

          return (
            <div key={note.id} className="bg-card border border-border p-4">
              {/* Timestamp */}
              <p className="text-xs text-ink-2 font-light mb-2">
                <span className="font-normal text-ink note-card-date">{date}</span>
                {' '}{time}
              </p>

              {/* Text */}
              <div className="relative">
                <p
                  className="text-sm font-light text-ink whitespace-pre-wrap"
                  style={collapsible && !isExpanded ? {
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  } : undefined}
                >
                  {note.text}
                </p>
                {collapsible && !isExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none" />
                )}
              </div>

              {collapsible && (
                <button
                  onClick={() => toggleExpand(note.id)}
                  className="text-xs text-accent font-light mt-1"
                >
                  {isExpanded ? '收合' : '展開全文'}
                </button>
              )}

              {/* AI result */}
              {note.aiResult && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-ink-2 tracking-label mb-1">AI 解析</p>
                  <p className="text-xs text-ink font-light whitespace-pre-wrap">{note.aiResult}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => handleAnalyze(note)}
                  disabled={analyzing.has(note.id)}
                  className="btn text-xs"
                >
                  {analyzing.has(note.id) ? '解析中...' : 'AI 解析'}
                </button>
                <button
                  onClick={() => { if (confirm('確定刪除？')) onDelete(note.id); }}
                  className="btn text-xs text-error border-error"
                >
                  刪除
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Batch import */}
      <BatchImport
        recipes={recipes}
        materials={materials}
        nextId={nextId}
        onAddMaterial={onAddMaterial}
        onUpdateStock={handleUpdateStock}
        onAddRecipe={onAddRecipe}
        onAddRecipeNote={onAddRecipeNote}
        onAddTask={onAddTask}
        suppressSync={suppressSync}
      />
    </div>
  );
}
