alter table business_memberships
  add column if not exists last_opened_at timestamptz;

create index if not exists business_memberships_user_last_opened_idx
  on business_memberships (user_id, last_opened_at desc)
  where status = 'active';

create table if not exists user_job_recents (
  user_id uuid not null references users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  last_opened_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

create index if not exists user_job_recents_business_user_last_opened_idx
  on user_job_recents (business_id, user_id, last_opened_at desc);
