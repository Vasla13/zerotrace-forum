import { ProfilePage } from "@/components/profile-page";

type ProfileRouteProps = {
  params: Promise<{ username: string }>;
};

export default async function UserProfilePage({
  params,
}: ProfileRouteProps) {
  const { username } = await params;

  return <ProfilePage username={username} />;
}
