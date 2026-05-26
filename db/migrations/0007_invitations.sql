create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  invited_email text not null,
  role text not null check (role in ('reviewer', 'field_user')),
  token_hash text not null,
  status text not null check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invited_by_user_id uuid not null references users(id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index if not exists invitations_business_created_idx
  on invitations (business_id, created_at desc);

create index if not exists invitations_token_hash_idx
  on invitations (token_hash);

create index if not exists invitations_business_email_status_idx
  on invitations (business_id, lower(invited_email), status);
