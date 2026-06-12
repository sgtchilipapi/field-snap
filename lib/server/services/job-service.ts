import { z } from "zod";
import { AUDIT_ACTIONS, recordAuditEvent } from "@/lib/server/audit/logs";
import { authorizeBusinessAccess } from "@/lib/server/auth/business-authorization";
import { JOB_FOLDER_TEMPLATES } from "@/lib/server/constants/folder-template";
import {
  findCategoryForBusinessByName,
  findCategoryForBusinessBySlug,
  getCategoryForBusiness,
  upsertCategory,
} from "@/lib/server/data/categories";
import { getDriveConnectionForBusiness } from "@/lib/server/data/drive-connections";
import { createJobFolder, listJobFolders } from "@/lib/server/data/job-folders";
import {
  archiveJob as archiveJobRecord,
  createJob as createJobRecord,
  findActiveDuplicateJob,
  getJobForBusiness,
  listJobsForBusiness,
  markJobOpenedForUser,
  updateJob as updateJobRecord,
  updateJobStatus as updateJobStatusRecord,
} from "@/lib/server/data/jobs";
import { decryptSecret } from "@/lib/server/security/encryption";
import { createGoogleDriveFolderInParent } from "@/lib/server/integrations/google/drive";
import type { CategoryRow } from "@/lib/server/db/schema";
import { markDriveConnectionIssue } from "@/lib/server/services/drive-connection-health";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Job date must use YYYY-MM-DD.");

const categoryIdSchema = z.string().uuid("Category selection is invalid.");

export const createJobSchema = z
  .object({
    category_id: categoryIdSchema.optional(),
    custom_category_name: z
      .string()
      .trim()
      .max(120, "Category name must be 120 characters or fewer.")
      .optional(),
    client_name: z
      .string()
      .trim()
      .min(1, "Client name is required.")
      .max(120, "Client name must be 120 characters or fewer."),
    job_name: z
      .string()
      .trim()
      .min(1, "Job name is required.")
      .max(120, "Job name must be 120 characters or fewer."),
    address: z
      .string()
      .trim()
      .max(255, "Address must be 255 characters or fewer.")
      .optional(),
    job_date: isoDateSchema,
  })
  .superRefine((value, ctx) => {
    const hasCategory = Boolean(value.category_id);
    const customCategory = value.custom_category_name?.trim() ?? "";

    if (!hasCategory && customCategory.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a category or create a custom one.",
        path: ["category_id"],
      });
    }
  });

export const updateJobSchema = z.object({
  category_id: categoryIdSchema,
  client_name: z
    .string()
    .trim()
    .min(1, "Client name is required.")
    .max(120, "Client name must be 120 characters or fewer."),
  job_name: z
    .string()
    .trim()
    .min(1, "Job name is required.")
    .max(120, "Job name must be 120 characters or fewer."),
  address: z
    .string()
    .trim()
    .max(255, "Address must be 255 characters or fewer.")
    .optional(),
  job_date: isoDateSchema,
});

export const updateJobStatusSchema = z.object({
  status: z.enum(["active", "completed", "archived"]),
});

export class JobServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "forbidden"
      | "not_found"
      | "duplicate"
      | "invalid_category"
      | "drive_unavailable",
  ) {
    super(message);
  }
}

function normalizeAddress(address: string | undefined) {
  const trimmed = address?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function slugifyCategoryName(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "category"
  );
}

async function createCustomCategoryForBusiness(input: {
  businessId: string;
  accessToken: string;
  rootFolderId: string;
  name: string;
}) {
  const existingByName = await findCategoryForBusinessByName(
    input.businessId,
    input.name,
  );

  if (existingByName) {
    return existingByName;
  }

  const baseSlug = slugifyCategoryName(input.name);
  let slug = baseSlug;
  let suffix = 2;

  while (await findCategoryForBusinessBySlug(input.businessId, slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const folder = await createGoogleDriveFolderInParent(
    input.accessToken,
    input.name,
    input.rootFolderId,
  );

  return upsertCategory({
    businessId: input.businessId,
    name: input.name,
    slug,
    isDefault: false,
    driveFolderId: folder.id,
  });
}

async function requireDriveConnectionForBusiness(businessId: string) {
  const connection = await getDriveConnectionForBusiness(businessId);

  if (
    !connection ||
    connection.status !== "active" ||
    !connection.access_token_encrypted
  ) {
    throw new JobServiceError(
      "An active Google Drive connection is required.",
      "drive_unavailable",
    );
  }

  return {
    connection,
    accessToken: decryptSecret(connection.access_token_encrypted),
  };
}

export function getJobFolderName(input: {
  clientName: string;
  jobName: string;
  jobDate: string;
}) {
  return `${input.clientName} - ${input.jobName} - ${input.jobDate}`;
}

export async function createJobForBusiness(input: {
  businessId: string;
  userId: string;
  values: unknown;
}) {
  const authorization = await authorizeBusinessAccess({
    businessId: input.businessId,
    userId: input.userId,
    capability: "jobs:manage",
  });

  if (!authorization.allowed) {
    throw new JobServiceError(
      "Only owner-admin members can create jobs.",
      "forbidden",
    );
  }

  const ownerDetails = authorization.details;

  const parsed = createJobSchema.parse(input.values);
  const clientName = parsed.client_name.trim();
  const jobName = parsed.job_name.trim();
  const address = normalizeAddress(parsed.address);
  const customCategoryName = parsed.custom_category_name?.trim() ?? "";

  const duplicateId = await findActiveDuplicateJob({
    businessId: input.businessId,
    clientName,
    jobName,
    jobDate: parsed.job_date,
  });

  if (duplicateId) {
    throw new JobServiceError(
      "An active job with the same client, job name, and date already exists.",
      "duplicate",
    );
  }

  const { accessToken } = await requireDriveConnectionForBusiness(
    input.businessId,
  );

  let category: CategoryRow | null = null;

  if (customCategoryName) {
    if (!ownerDetails.business.drive_root_folder_id) {
      throw new JobServiceError(
        "The business Drive root folder is not available.",
        "drive_unavailable",
      );
    }

    category = await createCustomCategoryForBusiness({
      businessId: input.businessId,
      accessToken,
      rootFolderId: ownerDetails.business.drive_root_folder_id,
      name: customCategoryName,
    });
  } else if (parsed.category_id) {
    category = await getCategoryForBusiness(
      input.businessId,
      parsed.category_id,
    );
  }

  if (!category || !category.drive_folder_id) {
    throw new JobServiceError(
      "The selected category is not available.",
      "invalid_category",
    );
  }

  const folderName = getJobFolderName({
    clientName,
    jobName,
    jobDate: parsed.job_date,
  });

  try {
    const jobFolder = await createGoogleDriveFolderInParent(
      accessToken,
      folderName,
      category.drive_folder_id,
    );

    const folderRecords = await Promise.all(
      JOB_FOLDER_TEMPLATES.map(async (folder) => {
        const driveFolder = await createGoogleDriveFolderInParent(
          accessToken,
          folder.name,
          jobFolder.id,
        );

        return {
          folderKey: folder.key,
          folderName: folder.name,
          driveFolderId: driveFolder.id,
        };
      }),
    );

    const inProcessFolder = folderRecords.find(
      (folder) => folder.folderKey === "in_process",
    );
    const needsReviewFolder = folderRecords.find(
      (folder) => folder.folderKey === "needs_review",
    );

    if (!inProcessFolder || !needsReviewFolder) {
      throw new Error("Required job subfolders were not created.");
    }

    const job = await createJobRecord({
      businessId: input.businessId,
      categoryId: category.id,
      clientName,
      jobName,
      address,
      jobDate: parsed.job_date,
      driveFolderId: jobFolder.id,
      inProcessFolderId: inProcessFolder.driveFolderId,
      needsReviewFolderId: needsReviewFolder.driveFolderId,
      createdByUserId: input.userId,
    });

    await Promise.all(
      folderRecords.map((folder) =>
        createJobFolder({
          jobId: job.id,
          folderKey: folder.folderKey,
          folderName: folder.folderName,
          driveFolderId: folder.driveFolderId,
        }),
      ),
    );

    await recordAuditEvent({
      businessId: input.businessId,
      actorUserId: input.userId,
      entityType: "job",
      entityId: job.id,
      action: AUDIT_ACTIONS.jobCreated,
      newValue: {
        category_id: category.id,
        client_name: job.client_name,
        job_name: job.job_name,
        job_date: job.job_date,
        drive_folder_id: job.drive_folder_id,
      },
    });

    return {
      job,
      folderName,
    };
  } catch (error) {
    await markDriveConnectionIssue(input.businessId, error, {
      businessId: input.businessId,
      userId: input.userId,
    });
    throw error;
  }
}

export async function listJobsForUser(input: {
  businessId: string;
  userId: string;
  status?: "active" | "completed" | "archived" | "all";
  categoryId?: string | null;
  search?: string | null;
}) {
  const authorization = await authorizeBusinessAccess({
    businessId: input.businessId,
    userId: input.userId,
    capability: "jobs:view",
  });

  if (!authorization.allowed) {
    return null;
  }

  return {
    membership: authorization.details.membership,
    jobs: await listJobsForBusiness({
      businessId: input.businessId,
      status: input.status,
      categoryId: input.categoryId,
      search: input.search,
      userId: input.userId,
    }),
  };
}

export async function getJobDetailsForUser(
  businessId: string,
  jobId: string,
  userId: string,
) {
  const authorization = await authorizeBusinessAccess({
    businessId,
    userId,
    capability: "jobs:view",
  });

  if (!authorization.allowed) {
    return null;
  }

  const job = await getJobForBusiness(businessId, jobId);

  if (!job) {
    return {
      membership: authorization.details.membership,
      job: null,
      folders: [],
    };
  }

  await markJobOpenedForUser({
    businessId,
    jobId,
    userId,
  });

  return {
    membership: authorization.details.membership,
    job,
    folders: await listJobFolders(jobId),
  };
}

export async function updateJobForBusiness(input: {
  businessId: string;
  jobId: string;
  userId: string;
  values: unknown;
}) {
  const authorization = await authorizeBusinessAccess({
    businessId: input.businessId,
    userId: input.userId,
    capability: "jobs:manage",
  });

  if (!authorization.allowed) {
    throw new JobServiceError(
      "Only owner-admin members can update jobs.",
      "forbidden",
    );
  }

  const existingJob = await getJobForBusiness(input.businessId, input.jobId);

  if (!existingJob) {
    throw new JobServiceError("Job not found.", "not_found");
  }

  const parsed = updateJobSchema.parse(input.values);
  const clientName = parsed.client_name.trim();
  const jobName = parsed.job_name.trim();
  const address = normalizeAddress(parsed.address);
  const category = await getCategoryForBusiness(
    input.businessId,
    parsed.category_id,
  );

  if (!category) {
    throw new JobServiceError(
      "The selected category is not available.",
      "invalid_category",
    );
  }

  const duplicateId = await findActiveDuplicateJob({
    businessId: input.businessId,
    clientName,
    jobName,
    jobDate: parsed.job_date,
    excludeJobId: input.jobId,
  });

  if (duplicateId) {
    throw new JobServiceError(
      "An active job with the same client, job name, and date already exists.",
      "duplicate",
    );
  }

  const job = await updateJobRecord({
    jobId: input.jobId,
    businessId: input.businessId,
    categoryId: parsed.category_id,
    clientName,
    jobName,
    address,
    jobDate: parsed.job_date,
  });

  if (!job) {
    throw new JobServiceError("Job not found.", "not_found");
  }

  return job;
}

export async function archiveJobForBusiness(
  businessId: string,
  jobId: string,
  userId: string,
) {
  return updateJobStatusForBusiness({
    businessId,
    jobId,
    userId,
    status: "archived",
  });
}

export async function updateJobStatusForBusiness(input: {
  businessId: string;
  jobId: string;
  userId: string;
  status: unknown;
}) {
  const authorization = await authorizeBusinessAccess({
    businessId: input.businessId,
    userId: input.userId,
    capability: "jobs:manage",
  });

  if (!authorization.allowed) {
    throw new JobServiceError(
      "Only owner-admin members can change job status.",
      "forbidden",
    );
  }

  const existingJob = await getJobForBusiness(input.businessId, input.jobId);

  if (!existingJob) {
    throw new JobServiceError("Job not found.", "not_found");
  }

  const parsed = updateJobStatusSchema.parse({
    status: input.status,
  });

  if (parsed.status === "active" && existingJob.status !== "active") {
    const duplicateId = await findActiveDuplicateJob({
      businessId: input.businessId,
      clientName: existingJob.client_name,
      jobName: existingJob.job_name,
      jobDate: existingJob.job_date,
      excludeJobId: input.jobId,
    });

    if (duplicateId) {
      throw new JobServiceError(
        "An active job with the same client, job name, and date already exists.",
        "duplicate",
      );
    }
  }

  const job =
    parsed.status === "archived"
      ? await archiveJobRecord(input.jobId, input.businessId)
      : await updateJobStatusRecord(
          input.jobId,
          input.businessId,
          parsed.status,
        );

  if (!job) {
    throw new JobServiceError("Job not found.", "not_found");
  }

  return job;
}
