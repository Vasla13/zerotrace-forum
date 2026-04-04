import { AuthGuard } from "@/components/auth-guard";
import { PostEditorForm } from "@/components/post-editor-form";

type EditPostRouteProps = {
  params: Promise<{ postId: string }>;
};

export const metadata = {
  title: "Modifier le post",
};

export default async function EditPostPage({ params }: EditPostRouteProps) {
  const { postId } = await params;

  return (
    <AuthGuard>
      <PostEditorForm mode="edit" postId={postId} />
    </AuthGuard>
  );
}
