import "server-only";

import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import { HttpError } from "@/lib/server/http";
import { normalizeUsername } from "@/lib/utils/text";
import { profileUsernameSchema } from "@/lib/validation/profile";

type ForumAuthorRecord = {
  uid: string;
  username: string;
  usernameLower: string;
};

function buildAuthor(uid: string, username: string): ForumAuthorRecord {
  return {
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

export async function renameForumUserServer(
  uid: string,
  payload: unknown,
) {
  const { username } = profileUsernameSchema.parse(payload);
  const nextUsername = username.trim();
  const nextUsernameLower = normalizeUsername(nextUsername);
  const db = getFirebaseAdminDb();
  const userRef = db.collection("users").doc(uid);

  const [postSnapshots, commentSnapshots] = await Promise.all([
    db.collection("posts").where("author.uid", "==", uid).get(),
    db.collectionGroup("comments").where("author.uid", "==", uid).get(),
  ]);

  const currentProfile = await db.runTransaction(async (transaction) => {
    const adminRef = db.collection("admins").doc(uid);
    const nextUsernameRef = db.collection("usernames").doc(nextUsernameLower);
    const [userSnapshot, adminSnapshot, nextUsernameSnapshot] =
      await transaction.getAll(userRef, adminRef, nextUsernameRef);

    if (!userSnapshot.exists) {
      throw new HttpError(404, "Profil introuvable.");
    }

    const userData = userSnapshot.data() as Record<string, unknown>;
    const currentUsername = String(userData.username ?? "").trim();
    const currentUsernameLower = String(
      userData.usernameLower ?? normalizeUsername(currentUsername),
    );

    if (!currentUsername || !currentUsernameLower) {
      throw new HttpError(409, "Profil incomplet. Contacte un administrateur.");
    }

    if (
      currentUsername === nextUsername &&
      currentUsernameLower === nextUsernameLower
    ) {
      return {
        username: currentUsername,
        usernameLower: currentUsernameLower,
      };
    }

    const currentUsernameRef = db.collection("usernames").doc(currentUsernameLower);

    if (currentUsernameLower !== nextUsernameLower) {
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
      username: nextUsername,
      usernameLower: nextUsernameLower,
    };
  });

  const nextAuthor = buildAuthor(uid, currentProfile.username);

  await Promise.all([
    updateAuthorSnapshots(postSnapshots.docs, nextAuthor),
    updateAuthorSnapshots(commentSnapshots.docs, nextAuthor),
    getFirebaseAdminAuth()
      .updateUser(uid, { displayName: currentProfile.username })
      .catch(() => undefined),
  ]);

  return currentProfile;
}
