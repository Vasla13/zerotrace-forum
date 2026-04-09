import { AuthForm } from "@/components/auth-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Accès",
};

export default function LoginPage() {
  return <AuthForm />;
}
