import { AuthForm } from "@/components/auth-form";

export const metadata = {
  title: "Provision",
};

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
