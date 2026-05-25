import { db } from "@/lib/server/db/client";
import type { CategoryRow } from "@/lib/server/db/schema";

function mapCategory(row: CategoryRow): CategoryRow {
  return {
    id: row.id,
    business_id: row.business_id,
    name: row.name,
    slug: row.slug,
    is_default: row.is_default,
    drive_folder_id: row.drive_folder_id,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export async function getCategoriesForBusiness(businessId: string) {
  const rows = await db<CategoryRow[]>`
    select
      id,
      business_id,
      name,
      slug,
      is_default,
      drive_folder_id,
      created_at,
      updated_at
    from categories
    where business_id = ${businessId}
    order by name asc
  `;

  return rows.map(mapCategory);
}

export async function getCategoryForBusiness(businessId: string, categoryId: string) {
  const rows = await db<CategoryRow[]>`
    select
      id,
      business_id,
      name,
      slug,
      is_default,
      drive_folder_id,
      created_at,
      updated_at
    from categories
    where business_id = ${businessId}
      and id = ${categoryId}
    limit 1
  `;

  return rows[0] ? mapCategory(rows[0]) : null;
}

export async function findCategoryForBusinessByName(businessId: string, name: string) {
  const rows = await db<CategoryRow[]>`
    select
      id,
      business_id,
      name,
      slug,
      is_default,
      drive_folder_id,
      created_at,
      updated_at
    from categories
    where business_id = ${businessId}
      and lower(name) = lower(${name})
    limit 1
  `;

  return rows[0] ? mapCategory(rows[0]) : null;
}

export async function findCategoryForBusinessBySlug(businessId: string, slug: string) {
  const rows = await db<CategoryRow[]>`
    select
      id,
      business_id,
      name,
      slug,
      is_default,
      drive_folder_id,
      created_at,
      updated_at
    from categories
    where business_id = ${businessId}
      and slug = ${slug}
    limit 1
  `;

  return rows[0] ? mapCategory(rows[0]) : null;
}

export async function upsertCategory(input: {
  businessId: string;
  name: string;
  slug: string;
  isDefault: boolean;
  driveFolderId: string;
}) {
  const rows = await db<CategoryRow[]>`
    insert into categories (
      business_id,
      name,
      slug,
      is_default,
      drive_folder_id
    )
    values (
      ${input.businessId},
      ${input.name},
      ${input.slug},
      ${input.isDefault},
      ${input.driveFolderId}
    )
    on conflict (business_id, slug)
    do update set
      name = excluded.name,
      is_default = excluded.is_default,
      drive_folder_id = excluded.drive_folder_id,
      updated_at = now()
    returning
      id,
      business_id,
      name,
      slug,
      is_default,
      drive_folder_id,
      created_at,
      updated_at
  `;

  return mapCategory(rows[0]);
}
