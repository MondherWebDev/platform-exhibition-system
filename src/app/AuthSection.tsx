"use client";
import { useSearchParams } from "next/navigation";
import AuthForm from '../components/AuthForm';

interface AuthSectionProps {
  initialEmail?: string | null;
}

export default function AuthSection({ initialEmail }: AuthSectionProps) {
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');

  return (
    <div className="w-full max-w-sm sm:max-w-md md:max-w-xl lg:max-w-3xl xl:max-w-4xl mx-auto my-8">
      <AuthForm redirectPath={redirectPath} initialEmail={initialEmail} />
    </div>
  );
}
