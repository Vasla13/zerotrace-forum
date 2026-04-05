import { AuthForm } from "@/components/auth-form";

export const metadata = {
  title: "Passerelle",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
