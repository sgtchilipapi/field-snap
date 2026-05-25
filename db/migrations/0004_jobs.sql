create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  category_id uuid not null references categories(id),
  client_name text not null,
  job_name text not null,
  address text,
  job_date date not null,
  drive_folder_id text not null,
  in_process_folder_id text not null,
  needs_review_folder_id text not null,
  status text not null check (status in ('active', 'archived')),
  created_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists jobs_active_identity_idx
  on jobs (business_id, client_name, job_name, job_date)
  where status = 'active';

create table if not exists job_folders (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  folder_key text not null,
  folder_name text not null,
  drive_folder_id text not null,
  created_at timestamptz not null default now(),
  unique (job_id, folder_key)
);
