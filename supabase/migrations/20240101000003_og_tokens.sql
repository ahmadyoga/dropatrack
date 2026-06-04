-- OG Token store: keyed by room slug, stores current snapshot for /api/og?t=slug
create table if not exists og_tokens (
  slug        text        primary key,
  track       text        not null default '',
  listeners   text        not null default '',  -- comma-separated initials, e.g. "A,B,K"
  extra       text        not null default '',  -- overflow count, e.g. "4"
  updated_at  timestamptz not null default now()
);

-- Allow public reads (OG image crawler needs this via anon key)
alter table og_tokens enable row level security;

create policy "Public read og_tokens"
  on og_tokens for select
  using (true);

-- Allow anon upserts (generateMetadata + /api/og/shorten both use the anon client)
create policy "Public upsert og_tokens"
  on og_tokens for insert
  with check (true);

create policy "Public update og_tokens"
  on og_tokens for update
  using (true);
