create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  google_sub text not null unique,
  email text not null unique,
  name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table if not exists business_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('owner_admin', 'reviewer', 'field_user')),
  status text not null check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

