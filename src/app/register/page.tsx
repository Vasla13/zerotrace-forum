import { AuthForm } from "@/components/auth-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Identité",
};

export default function RegisterPage() {
  return <AuthForm />;
}
