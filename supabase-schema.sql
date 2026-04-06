-- ================================================================
-- SINUS NOTE — Supabase schema
-- Run this entire file in Supabase → SQL Editor
-- ================================================================

-- ── Tables ───────────────────────────────────────────────────────

create table recipes (
  id          integer      primary key,
  user_id     uuid         not null references auth.users(id) on delete cascade,
  num         text         not null default '',
  name        text         not null default '未命名',
  frag_cat    text         not null default 'test'
                check (frag_cat in ('shrine','improve','green','wood','floral','resin','western','special','tincture','test')),
  status      text         not null default 'pending'
                check (status in ('success','fail','pending','progress','order')),
  rating      integer      not null default 0,
  tags        text[]       not null default '{}',
  process     jsonb        not null default '{}',
  timeline    jsonb        not null default '{}',
  versions    jsonb        not null default '[]',
  burn_log    jsonb        not null default '[]',
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

create table tasks (
  id             text         primary key,
  user_id        uuid         not null references auth.users(id) on delete cascade,
  title          text         not null default '',
  material       text         not null default '',
  recipe_id      integer      references recipes(id) on delete set null,
  task_type      text         not null default 'other',
  status         text         not null default 'waiting'
                   check (status in ('prep','processing','waiting','ready','done')),
  start_date     text         not null default '',
  due_date       text,
  completed_date text,
  notes          text         not null default '',
  checkpoints    jsonb        not null default '[]',
  created_at     timestamptz  not null default now(),
  updated_at     timestamptz  not null default now()
);

create table materials (
  id       text        primary key,
  user_id  uuid        not null references auth.users(id) on delete cascade,
  cat      text        not null default 'herb',
  name     text        not null default '',
  origin   text        not null default '',
  supplier text        not null default '',
  note     text        not null default '',
  stock    jsonb       not null default '{}'
);

create table notes (
  id        text        primary key,
  user_id   uuid        not null references auth.users(id) on delete cascade,
  text      text        not null default '',
  ts        bigint      not null,
  ai_result text
);

-- Stores nextId, catOrder, catImages per user
create table user_config (
  user_id    uuid         primary key references auth.users(id) on delete cascade,
  next_id    integer      not null default 200,
  cat_order  text[],
  cat_images jsonb        not null default '{}',
  updated_at timestamptz  not null default now()
);

-- ── Row Level Security ────────────────────────────────────────────
-- Every table: users can only read/write their own rows.

alter table recipes     enable row level security;
alter table tasks       enable row level security;
alter table materials   enable row level security;
alter table notes       enable row level security;
alter table user_config enable row level security;

create policy "own data" on recipes     using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own data" on tasks       using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own data" on materials   using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own data" on notes       using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own data" on user_config using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Indexes ───────────────────────────────────────────────────────
create index on recipes   (user_id);
create index on tasks     (user_id);
create index on materials (user_id);
create index on notes     (user_id, ts desc);

-- ── Realtime ──────────────────────────────────────────────────────
-- Enable realtime for the tables that need live sync.
-- Go to: Supabase Dashboard → Database → Replication → Supabase Realtime
-- and add: recipes, tasks, materials, notes, user_config
--
-- Or run:
alter publication supabase_realtime add table recipes;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table materials;
alter publication supabase_realtime add table notes;
alter publication supabase_realtime add table user_config;
