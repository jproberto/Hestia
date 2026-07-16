import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Hestia</h1>
          <p className="text-sm text-muted-foreground">
            Entre com seu email e senha
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
