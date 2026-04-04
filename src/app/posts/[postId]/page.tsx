import { PostPage } from "@/components/post-page";

type PostRouteProps = {
  params: Promise<{ postId: string }>;
};

export default async function PostDetailsPage({ params }: PostRouteProps) {
  const { postId } = await params;

  return <PostPage postId={postId} />;
}
