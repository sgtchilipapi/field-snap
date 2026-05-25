create table if not exists drive_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  connected_by_user_id uuid not null references users(id),
  google_account_email text not null,
  access_token_encrypted text,
  refresh_token_encrypted text,
  scopes text[] not null,
  status text not null check (status in ('active', 'revoked', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id)
);
