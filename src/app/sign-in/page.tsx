import { SignInForm } from "@/components/auth-forms";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  return <SignInForm callbackUrl={callbackUrl ?? "/dashboard"} />;
}
