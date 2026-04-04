import { AuthGuard } from "@/components/auth-guard";
import { PostEditorForm } from "@/components/post-editor-form";

export const metadata = {
  title: "Nouveau post",
};

export default function NewPostPage() {
  return (
    <AuthGuard>
      <PostEditorForm mode="create" />
    </AuthGuard>
  );
}
