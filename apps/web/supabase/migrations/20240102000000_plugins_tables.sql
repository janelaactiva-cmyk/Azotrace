-- =============================================
-- 1. WAITLIST PLUGIN
-- =============================================
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.waitlist enable row level security;

-- Permitir que qualquer visitante anónimo ou autenticado se inscreva na waitlist
create policy "Anyone can join waitlist"
  on public.waitlist for insert
  with check (true);

-- =============================================
-- 2. ROADMAP PLUGIN
-- =============================================
create table if not exists public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'planned' check (status in ('under_review', 'planned', 'in_progress', 'completed')),
  votes_count integer default 0 not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.roadmap_items enable row level security;

-- Todos podem ver o roadmap
create policy "Roadmap items are public"
  on public.roadmap_items for select
  using (true);

-- Utilizadores autenticados podem sugerir itens no roadmap
create policy "Authenticated users can create roadmap items"
  on public.roadmap_items for insert
  with check (auth.role() = 'authenticated');

-- Tabela de votos no Roadmap
create table if not exists public.roadmap_votes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.roadmap_items(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(item_id, user_id)
);

alter table public.roadmap_votes enable row level security;

create policy "Users can vote once per item"
  on public.roadmap_votes for insert
  with check (auth.uid() = user_id);

create policy "Votes are public"
  on public.roadmap_votes for select
  using (true);

-- =============================================
-- 3. TESTIMONIAL PLUGIN
-- =============================================
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  author_title text,
  company text,
  avatar_url text,
  content text not null,
  rating integer check (rating >= 1 and rating <= 5),
  approved boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.testimonials enable row level security;

-- Apenas testemunhos aprovados são visíveis publicamente
create policy "Approved testimonials are public"
  on public.testimonials for select
  using (approved = true);

-- Utilizadores autenticados podem submeter testemunhos
create policy "Users can submit testimonials"
  on public.testimonials for insert
  with check (auth.role() = 'authenticated');
