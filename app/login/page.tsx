import { LoginForm } from "./login-form";
import { HestiaLayout } from "@/components/layout/HestiaLayout";

export default function LoginPage() {
  return (
    <HestiaLayout pageTitle="Login" pageSubtitle="Entre com seu email e senha">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <LoginForm />
      </div>
    </HestiaLayout>
  );
}
