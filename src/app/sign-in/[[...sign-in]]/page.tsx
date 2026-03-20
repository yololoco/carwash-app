import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Droplets } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 bg-gradient-to-b from-[#F0FAFF] via-white to-[#F5FBFF]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,#B8E6FF_0%,transparent_70%)] opacity-30" />
        <div className="absolute -left-32 bottom-0 h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,#CCF0FF_0%,transparent_70%)] opacity-25" />
      </div>
      <div className="relative flex flex-col items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <Droplets className="h-8 w-8 text-[#0099CC]" />
          <span className="text-2xl font-bold">
            my<span className="text-[#0099CC]">Wash</span>
          </span>
        </Link>
        <SignIn />
      </div>
    </div>
  );
}
