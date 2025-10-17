"use client";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import AuthForm from '../components/AuthForm';

interface AuthSectionProps {
  initialEmail?: string | null;
}

export default function AuthSection({ initialEmail }: AuthSectionProps) {
  const searchParams = useSearchParams();

  // Memoize redirect path to prevent unnecessary re-renders
  const redirectPath = useMemo(() => {
    return searchParams.get('redirect');
  }, [searchParams]);

  return (
    <div className="w-full max-w-sm sm:max-w-md md:max-w-xl lg:max-w-3xl xl:max-w-4xl mx-auto my-8">
      <AuthForm redirectPath={redirectPath} initialEmail={initialEmail} />
    </div>
  );
}
