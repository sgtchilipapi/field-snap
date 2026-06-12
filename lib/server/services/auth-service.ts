import { AuthFlowError } from "@/lib/server/auth/errors";
import {
  createUserFromGoogleProfile,
  findUserByGoogleSub,
  getUserWithMemberships,
  updateUserFromGoogleProfile,
  type GoogleUserRecord,
} from "@/lib/server/data/users";
import type { GoogleIdentity } from "@/lib/server/integrations/google/oauth";
import { getMostRecentBusinessJobsPathForUser } from "@/lib/server/services/business-service";

export function getPostLoginRedirect(
  membershipCount: number,
  recentBusinessPath?: string | null,
) {
  if (membershipCount === 0) {
    return "/businesses/new";
  }

  return recentBusinessPath ?? "/businesses";
}

function toGoogleUserRecord(identity: GoogleIdentity): GoogleUserRecord {
  return {
    sub: identity.sub,
    email: identity.email,
    emailVerified: identity.emailVerified,
    name: identity.name,
    avatarUrl: identity.avatarUrl,
  };
}

export async function loginOrCreateUserFromGoogle(identity: GoogleIdentity) {
  if (!identity.emailVerified) {
    throw new AuthFlowError(
      "email_not_verified",
      "Google did not return a verified email address.",
    );
  }

  const existingUser = await findUserByGoogleSub(identity.sub);
  const profile = toGoogleUserRecord(identity);

  try {
    if (!existingUser) {
      const createdUser = await createUserFromGoogleProfile(profile);
      return {
        user: createdUser,
        redirectTo: getPostLoginRedirect(0),
      };
    }

    const updatedUser = await updateUserFromGoogleProfile(
      existingUser.id,
      profile,
    );
    const details = await getUserWithMemberships(updatedUser.id);

    const membershipCount = details?.memberships.length ?? 0;
    const recentBusinessPath =
      membershipCount > 0
        ? await getMostRecentBusinessJobsPathForUser(updatedUser.id)
        : null;

    return {
      user: updatedUser,
      redirectTo: getPostLoginRedirect(membershipCount, recentBusinessPath),
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new AuthFlowError(
        "unexpected",
        "A duplicate user record blocked Google sign-in.",
      );
    }

    throw error;
  }
}

export async function getPostLoginRedirectForUser(userId: string) {
  const details = await getUserWithMemberships(userId);
  const membershipCount = details?.memberships.length ?? 0;
  const recentBusinessPath =
    membershipCount > 0
      ? await getMostRecentBusinessJobsPathForUser(userId)
      : null;

  return getPostLoginRedirect(membershipCount, recentBusinessPath);
}
