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
