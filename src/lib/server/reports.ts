import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import { HttpError } from "@/lib/server/http";
import { createReportSchema } from "@/lib/validation/reports";

function toDate(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate() as Date;
  }

  return null;
}

async function getUsernameByUid(uid: string) {
  const snapshot = await getFirebaseAdminDb().collection("users").doc(uid).get();

  if (!snapshot.exists) {
    throw new HttpError(404, "Profil introuvable.");
  }

  return String(snapshot.data()?.username ?? uid);
}

export async function createForumReportServer(uid: string, payload: unknown) {
  const values = createReportSchema.parse(payload);
  const db = getFirebaseAdminDb();
  const reportedByUsername = await getUsernameByUid(uid);
  const targetKey = values.kind === "comment" ? values.commentId : "post";
  const reportId = `${values.kind}_${values.postId}_${targetKey}_${uid}`;

  await db.collection("reports").doc(reportId).set({
    commentId: values.commentId ?? null,
    createdAt: Timestamp.now(),
    kind: values.kind,
    postId: values.postId,
    postTitle: values.postTitle ?? null,
    previewText: values.previewText,
    reportedByUid: uid,
    reportedByUsername,
    resolved: false,
    resolvedAt: null,
    resolvedByUid: null,
    targetAuthorUsername: values.targetAuthorUsername,
  });
}

export async function listForumReportsServer() {
  const snapshot = await getFirebaseAdminDb()
    .collection("reports")
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();

    return {
      commentId:
        typeof data.commentId === "string" && data.commentId.trim()
          ? data.commentId
          : null,
      createdAt: toDate(data.createdAt),
      id: documentSnapshot.id,
      kind: data.kind === "comment" ? "comment" : "post",
      postId: String(data.postId ?? ""),
      postTitle:
        typeof data.postTitle === "string" && data.postTitle.trim()
          ? data.postTitle
          : null,
      previewText: String(data.previewText ?? ""),
      reportedByUsername: String(data.reportedByUsername ?? "inconnu"),
      resolved: Boolean(data.resolved),
      resolvedAt: toDate(data.resolvedAt),
      targetAuthorUsername: String(data.targetAuthorUsername ?? "inconnu"),
    };
  });
}

export async function setForumReportResolvedServer(
  reportId: string,
  actorUid: string,
  resolved: boolean,
) {
  const reportRef = getFirebaseAdminDb().collection("reports").doc(reportId);
  const reportSnapshot = await reportRef.get();

  if (!reportSnapshot.exists) {
    throw new HttpError(404, "Signalement introuvable.");
  }

  await reportRef.update({
    resolved,
    resolvedAt: resolved ? Timestamp.now() : null,
    resolvedByUid: resolved ? actorUid : null,
  });
}

export async function deleteForumReportServer(reportId: string) {
  await getFirebaseAdminDb().collection("reports").doc(reportId).delete();
}
