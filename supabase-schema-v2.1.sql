-- ================================================================
-- SINUS NOTE — v2.1 Material schema 擴充
-- ----------------------------------------------------------------
-- ⚠️ 不要直接執行這個檔。先讀完 SINUS_NOTE_DATA_MODEL_v2.1_SPEC.md
--    Phase 2 Step 1（備份）和 Phase 2 Step 2（產對照表）完成後
--    再貼到 Supabase SQL Editor 執行。
--
-- 用途：
--   1. materials 表新增 v2.1 的 9 個欄位（全部 nullable）
--   2. recipes.versions[].ingredients 仍為 jsonb，無需 schema 變更
--      —— v2.1 新增的 materialId 欄位寫在 jsonb 內即可
--   3. 加 GIN 索引讓 aliases 陣列可快速查詢
--   4. 加普通索引讓 speciesGroup 可快速分組
-- ================================================================

-- ── 新增欄位 ─────────────────────────────────────────────────────
-- 全部 nullable，舊資料不影響。
alter table materials
  add column if not exists display_short text,
  add column if not exists species       text,
  add column if not exists species_group text,
  add column if not exists grade         text,
  add column if not exists quality_note  text,
  add column if not exists aliases       text[],
  add column if not exists v3_warnings   text[],
  add column if not exists hard_ceiling  numeric,
  add column if not exists test_status   text
    check (test_status is null or test_status in ('pending', 'tested', 'verified')),
  add column if not exists added_at      timestamptz,
  add column if not exists updated_at    timestamptz;

-- ── 索引 ─────────────────────────────────────────────────────────
-- speciesGroup 視圖：按物種分組會頻繁查詢
create index if not exists materials_species_group_idx
  on materials (user_id, species_group);

-- aliases 陣列查詢：autocomplete 比對舊配方鬼影名稱
create index if not exists materials_aliases_gin_idx
  on materials using gin (aliases);

-- ── 備註 ─────────────────────────────────────────────────────────
-- mu* → m* ID 統一在 Phase 2 Step 4 用 UPDATE 處理，不在這個 schema 動。
-- recipes.versions jsonb 內加 materialId 是資料層遷移，不需 schema 改動。
