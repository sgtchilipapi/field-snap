alter table businesses
  add column if not exists drive_root_folder_id text,
  add column if not exists general_docs_folder_id text,
  add column if not exists updated_at timestamptz not null default now();

alter table business_memberships
  add column if not exists updated_at timestamptz not null default now();
