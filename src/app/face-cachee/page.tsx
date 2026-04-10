import { AuthGuard } from "@/components/auth-guard";
import { ForumHome } from "@/components/forum-home";

export const metadata = {
  title: "Face cachée",
};

export default function ShadowForumPage() {
  return (
    <AuthGuard>
      <ForumHome realm="certified" />
    </AuthGuard>
  );
}
