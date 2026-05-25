create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  uploaded_by_user_id uuid not null references users(id),
  capture_context text not null check (capture_context in ('job', 'general')),
  original_drive_file_id text not null,
  current_drive_file_id text not null,
  current_drive_folder_id text not null,
  original_filename text,
  current_filename text,
  mime_type text,
  file_size_bytes bigint,
  status text not null check (
    status in (
      'uploaded_to_in_process',
      'ai_processing',
      'auto_filed',
      'needs_review',
      'reviewed',
      'failed'
    )
  ),
  document_type text,
  target_folder_key text,
  vendor_or_party text,
  document_date date,
  amount numeric(12,2),
  currency text,
  invoice_number text,
  due_date date,
  ai_confidence numeric(5,4),
  ai_needs_review boolean,
  ai_reason text,
  ai_raw_response jsonb,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_business_created_idx
  on documents (business_id, created_at desc);

create index if not exists documents_job_created_idx
  on documents (job_id, created_at desc);

create table if not exists document_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  correlation_id text not null,
  status text not null check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists document_processing_jobs_status_available_idx
  on document_processing_jobs (status, available_at, created_at);
