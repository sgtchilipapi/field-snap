import { db } from "@/lib/server/db/client";
import type { BusinessMembershipRow, UserRow } from "@/lib/server/db/schema";

export type UserMembershipSummary = {
  businessId: string;
  businessName: string;
  role: BusinessMembershipRow["role"];
  status: BusinessMembershipRow["status"];
};

export type UserWithMemberships = {
  user: UserRow;
  memberships: UserMembershipSummary[];
};

export type GoogleUserRecord = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
};

function mapUser(row: {
  id: string;
  google_sub: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}): UserRow {
  return {
    id: row.id,
    google_sub: row.google_sub,
    email: row.email,
    name: row.name,
    avatar_url: row.avatar_url,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export async function findUserByGoogleSub(googleSub: string) {
  const rows = await db<UserRow[]>`
    select id, google_sub, email, name, avatar_url, created_at, updated_at
    from users
    where google_sub = ${googleSub}
    limit 1
  `;

  return rows[0] ? mapUser(rows[0]) : null;
}

export async function findUserById(userId: string) {
  const rows = await db<UserRow[]>`
    select id, google_sub, email, name, avatar_url, created_at, updated_at
    from users
    where id = ${userId}
    limit 1
  `;

  return rows[0] ? mapUser(rows[0]) : null;
}

export async function createUserFromGoogleProfile(profile: GoogleUserRecord) {
  const rows = await db<UserRow[]>`
    insert into users (google_sub, email, name, avatar_url)
    values (${profile.sub}, ${profile.email}, ${profile.name}, ${profile.avatarUrl})
    returning id, google_sub, email, name, avatar_url, created_at, updated_at
  `;

  return mapUser(rows[0]);
}

export async function updateUserFromGoogleProfile(existingUserId: string, profile: GoogleUserRecord) {
  const rows = await db<UserRow[]>`
    update users
    set
      email = ${profile.email},
      name = ${profile.name},
      avatar_url = ${profile.avatarUrl},
      updated_at = now()
    where id = ${existingUserId}
    returning id, google_sub, email, name, avatar_url, created_at, updated_at
  `;

  return mapUser(rows[0]);
}

export async function getUserWithMemberships(userId: string): Promise<UserWithMemberships | null> {
  const user = await findUserById(userId);

  if (!user) {
    return null;
  }

  const memberships = await db<UserMembershipSummary[]>`
    select
      b.id as "businessId",
      b.name as "businessName",
      bm.role as "role",
      bm.status as "status"
    from business_memberships bm
    inner join businesses b on b.id = bm.business_id
    where bm.user_id = ${userId}
    order by b.name asc
  `;

  return {
    user,
    memberships
  };
}

