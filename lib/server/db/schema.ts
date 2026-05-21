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
  created_at: Date;
};

export type BusinessMembershipRow = {
  id: string;
  business_id: string;
  user_id: string;
  role: "owner_admin" | "reviewer" | "field_user";
  status: "active" | "disabled";
  created_at: Date;
};

