-- VEU Curates: Supabase schema (fits the Free plan: 500 MB database).
-- Run in the Supabase SQL editor. Auth users live in auth.users; app data hangs off them.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  ig_handle text,
  analysed_before boolean,
  marketing_consent boolean not null default false,
  consent_at timestamptz,
  undertone_lean text check (undertone_lean in ('warm', 'cool', 'neutral', 'not_sure')),
  skin_hex text,
  lip_hex text,
  look smallint check (look between 0 and 2),
  pref_weights jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Skin hex measured in person by Ms Eunice (the booklet stays the full result).
create table if not exists public.client_skin (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  client_email text not null,
  skin_hex text not null,
  entered_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id bigint generated always as identity primary key,
  brand text not null,
  brand_origin text,
  name text not null,
  category text not null,            -- lips | cheeks | eyes | base | ...
  finish text,
  price_sgd text,
  where_to_buy text,
  link text,
  seasons text[] default '{}',
  active boolean not null default true
);

create table if not exists public.shades (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  shade_name text not null,
  shade_code text,
  pan_hex text,
  payoff_hex text,                   -- true payoff from swatch research
  confidence text check (confidence in ('high', 'medium', 'low')) default 'low',
  pan_to_payoff_de numeric
);

create table if not exists public.swatches (
  id bigint generated always as identity primary key,
  shade_id bigint not null references public.shades (id) on delete cascade,
  hex text not null,
  source_link text,
  creator text,
  body_area text,
  skin_depth text,
  layers smallint,
  lighting text,
  created_at timestamptz not null default now()
);

-- Analytics. Keep payloads small: this table is what grows. Roll up and prune if it nears ~300 MB.
create table if not exists public.events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  anon_id text,
  type text not null,                -- shade_viewed, shade_liked, shade_disliked, recommend_me_used, product_clicked,
                                     -- search, search_no_results, slider_adjusted, lean_picked, brand_suggested,
                                     -- signup, booking_clicked, lesson_completed
  shade_id bigint,
  product_id bigint,
  details jsonb,
  device text,
  created_at timestamptz not null default now()
);
create index if not exists events_type_time on public.events (type, created_at desc);

create table if not exists public.brand_requests (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  brand text not null,
  product text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_progress (
  user_id uuid references auth.users (id) on delete cascade,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- Row level security
alter table public.profiles enable row level security;
alter table public.client_skin enable row level security;
alter table public.products enable row level security;
alter table public.shades enable row level security;
alter table public.swatches enable row level security;
alter table public.events enable row level security;
alter table public.brand_requests enable row level security;
alter table public.lesson_progress enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own skin record" on public.client_skin for select using (auth.uid() = user_id);
create policy "catalogue readable" on public.products for select using (active);
create policy "shades readable" on public.shades for select using (true);
create policy "swatches readable" on public.swatches for select using (true);
create policy "anyone can log events" on public.events for insert with check (true);
create policy "signed-in brand requests" on public.brand_requests for insert with check (auth.uid() = user_id);
create policy "own lesson progress" on public.lesson_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Admin reads/writes (dashboard, catalogue, client skin entry) go through Vercel serverless routes
-- using the service role key, never from the browser.
