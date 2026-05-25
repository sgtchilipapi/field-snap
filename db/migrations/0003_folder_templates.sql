create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  slug text not null,
  is_default boolean not null default false,
  drive_folder_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, slug)
);

create table if not exists general_folders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  folder_key text not null,
  folder_name text not null,
  drive_folder_id text not null,
  created_at timestamptz not null default now(),
  unique (business_id, folder_key)
);
