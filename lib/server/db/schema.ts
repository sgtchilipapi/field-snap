export type UserRow = {
  id: string;
  google_sub: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
};

export type BusinessRow = {
  id: string;
  name: string;
  owner_user_id: string;
  drive_root_folder_id: string | null;
  general_docs_folder_id: string | null;
  created_at: Date;
  updated_at: Date;
};

export type BusinessMembershipRow = {
  id: string;
  business_id: string;
  user_id: string;
  role: "owner_admin" | "reviewer" | "field_user";
  status: "active" | "disabled";
  last_opened_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type DriveConnectionRow = {
  id: string;
  business_id: string;
  connected_by_user_id: string;
  google_account_email: string;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  scopes: string[];
  status: "active" | "revoked" | "error";
  created_at: Date;
  updated_at: Date;
};

export type CategoryRow = {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  is_default: boolean;
  drive_folder_id: string | null;
  created_at: Date;
  updated_at: Date;
};

export type GeneralFolderRow = {
  id: string;
  business_id: string;
  folder_key: string;
  folder_name: string;
  drive_folder_id: string;
  created_at: Date;
};

export type JobRow = {
  id: string;
  business_id: string;
  category_id: string;
  client_name: string;
  job_name: string;
  address: string | null;
  job_date: string;
  drive_folder_id: string;
  in_process_folder_id: string;
  needs_review_folder_id: string;
  status: "active" | "completed" | "archived";
  created_by_user_id: string;
  created_at: Date;
  updated_at: Date;
};

export type JobFolderRow = {
  id: string;
  job_id: string;
  folder_key: string;
  folder_name: string;
  drive_folder_id: string;
  created_at: Date;
};

export type DocumentRow = {
  id: string;
  business_id: string;
  job_id: string | null;
  uploaded_by_user_id: string;
  capture_context: "job" | "general";
  original_drive_file_id: string;
  current_drive_file_id: string;
  current_drive_folder_id: string;
  original_filename: string | null;
  current_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  status:
    | "uploaded_to_in_process"
    | "ai_processing"
    | "auto_filed"
    | "needs_review"
    | "reviewed"
    | "failed";
  document_type: string | null;
  target_folder_key: string | null;
  vendor_or_party: string | null;
  document_date: string | null;
  amount: string | null;
  currency: string | null;
  invoice_number: string | null;
  due_date: string | null;
  ai_confidence: string | null;
  ai_needs_review: boolean | null;
  ai_reason: string | null;
  ai_raw_response: unknown | null;
  failure_reason: string | null;
  created_at: Date;
  updated_at: Date;
};

export type DocumentProcessingJobRow = {
  id: string;
  document_id: string;
  correlation_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  attempts: number;
  available_at: Date;
  created_at: Date;
  updated_at: Date;
};

export type InvitationRow = {
  id: string;
  business_id: string;
  invited_email: string;
  role: "reviewer" | "field_user";
  token_hash: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  invited_by_user_id: string;
  expires_at: Date;
  created_at: Date;
  accepted_at: Date | null;
};

export type UserJobRecentRow = {
  user_id: string;
  business_id: string;
  job_id: string;
  last_opened_at: Date;
};

export type AuditLogRow = {
  id: string;
  business_id: string;
  actor_user_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  old_value: unknown | null;
  new_value: unknown | null;
  created_at: Date;
};
