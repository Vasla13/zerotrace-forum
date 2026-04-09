import "server-only";

import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import { HttpError } from "@/lib/server/http";
import { normalizeUsername } from "@/lib/utils/text";
import { profileUpdateSchema } from "@/lib/validation/profile";

type ForumAuthorRecord = {
  avatarUrl: string | null;
  uid: string;
  username: string;
  usernameLower: string;
};

function buildAuthor(
  uid: string,
  username: string,
  avatarUrl: string | null,
): ForumAuthorRecord {
  return {
    avatarUrl,
    uid,
    username,
    usernameLower: normalizeUsername(username),
  };
}

async function updateAuthorSnapshots(
  documents: FirebaseFirestore.QueryDocumentSnapshot[],
  author: ForumAuthorRecord,
) {
  if (!documents.length) {
    return;
  }

  const db = getFirebaseAdminDb();

  for (let index = 0; index < documents.length; index += 400) {
    const batch = db.batch();

    documents.slice(index, index + 400).forEach((documentSnapshot) => {
      batch.update(documentSnapshot.ref, { author });
    });

    await batch.commit();
  }
}

async function updateReportsForProfileChange(options: {
  currentUsername: string;
  nextUsername: string;
  uid: string;
}) {
  const db = getFirebaseAdminDb();
  const [reportedBySnapshots, targetAuthorSnapshots] = await Promise.all([
    db.collection("reports").where("reportedByUid", "==", options.uid).get(),
    options.currentUsername !== options.nextUsername
      ? db
          .collection("reports")
          .where("targetAuthorUsername", "==", options.currentUsername)
          .get()
      : Promise.resolve(null),
  ]);

  for (let index = 0; index < reportedBySnapshots.docs.length; index += 400) {
    const batch = db.batch();

    reportedBySnapshots.docs.slice(index, index + 400).forEach((reportSnapshot) => {
      batch.update(reportSnapshot.ref, {
        reportedByUsername: options.nextUsername,
      });
    });

    await batch.commit();
  }

  if (!targetAuthorSnapshots) {
    return;
  }

  for (let index = 0; index < targetAuthorSnapshots.docs.length; index += 400) {
    const batch = db.batch();

    targetAuthorSnapshots.docs
      .slice(index, index + 400)
      .forEach((reportSnapshot) => {
        batch.update(reportSnapshot.ref, {
          targetAuthorUsername: options.nextUsername,
        });
      });

    await batch.commit();
  }
}

export async function updateForumProfileServer(
  uid: string,
  payload: unknown,
) {
  const values = profileUpdateSchema.parse(payload);
  const db = getFirebaseAdminDb();
  const userRef = db.collection("users").doc(uid);

  const [postSnapshots, commentSnapshots] = await Promise.all([
    db.collection("posts").where("author.uid", "==", uid).get(),
    db.collectionGroup("comments").where("author.uid", "==", uid).get(),
  ]);

  const currentProfile = await db.runTransaction(async (transaction) => {
    const adminRef = db.collection("admins").doc(uid);
    const [userSnapshot, adminSnapshot] = await transaction.getAll(userRef, adminRef);

    if (!userSnapshot.exists) {
      throw new HttpError(404, "Profil introuvable.");
    }

    const userData = userSnapshot.data() as Record<string, unknown>;
    const currentUsername = String(userData.username ?? "").trim();
    const currentUsernameLower = String(
      userData.usernameLower ?? normalizeUsername(currentUsername),
    );
    const currentAvatarUrl =
      typeof userData.avatarUrl === "string" && userData.avatarUrl.trim()
        ? userData.avatarUrl
        : null;

    if (!currentUsername || !currentUsernameLower) {
      throw new HttpError(409, "Profil incomplet. Contacte un administrateur.");
    }

    const nextUsername = values.username?.trim() ?? currentUsername;
    const nextUsernameLower = normalizeUsername(nextUsername);
    const nextAvatarUrl =
      values.avatarUrl === undefined ? currentAvatarUrl : values.avatarUrl;

    if (
      currentUsername === nextUsername &&
      currentUsernameLower === nextUsernameLower &&
      currentAvatarUrl === nextAvatarUrl
    ) {
      return {
        avatarUrl: currentAvatarUrl,
        previousUsername: currentUsername,
        username: currentUsername,
        usernameLower: currentUsernameLower,
      };
    }

    const currentUsernameRef = db.collection("usernames").doc(currentUsernameLower);

    if (currentUsernameLower !== nextUsernameLower) {
      const nextUsernameRef = db.collection("usernames").doc(nextUsernameLower);
      const nextUsernameSnapshot = await transaction.get(nextUsernameRef);

      if (
        nextUsernameSnapshot.exists &&
        String(nextUsernameSnapshot.data()?.uid ?? "") !== uid
      ) {
        throw new HttpError(409, "Ce pseudo est déjà utilisé.");
      }

      transaction.set(nextUsernameRef, {
        createdAt: userData.createdAt ?? null,
        uid,
        username: nextUsername,
        usernameLower: nextUsernameLower,
      });
      transaction.delete(currentUsernameRef);
    } else {
      transaction.set(
        currentUsernameRef,
        {
          username: nextUsername,
          usernameLower: nextUsernameLower,
        },
        { merge: true },
      );
    }

    transaction.update(userRef, {
      avatarUrl: nextAvatarUrl,
      username: nextUsername,
      usernameLower: nextUsernameLower,
    });

    if (adminSnapshot.exists) {
      transaction.set(
        adminRef,
        {
          username: nextUsername,
          usernameLower: nextUsernameLower,
        },
        { merge: true },
      );
    }

    return {
      avatarUrl: nextAvatarUrl,
      previousUsername: currentUsername,
      username: nextUsername,
      usernameLower: nextUsernameLower,
    };
  });

  const nextAuthor = buildAuthor(
    uid,
    currentProfile.username,
    currentProfile.avatarUrl,
  );

  await Promise.all([
    updateAuthorSnapshots(postSnapshots.docs, nextAuthor),
    updateAuthorSnapshots(commentSnapshots.docs, nextAuthor),
    updateReportsForProfileChange({
      currentUsername: currentProfile.previousUsername,
      nextUsername: currentProfile.username,
      uid,
    }),
    getFirebaseAdminAuth()
      .updateUser(uid, {
        displayName: currentProfile.username,
        photoURL: currentProfile.avatarUrl,
      })
      .catch(() => undefined),
  ]);

  return currentProfile;
}
