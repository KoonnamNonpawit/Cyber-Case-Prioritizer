"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Logo from "@/public/logo.png";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const Topbar = () => {
  const pathname = usePathname();
  const session = null; // Replace with actual session logic

  const isActive = (path: string) => pathname === path;

  return (
    <div className="flex flex-row justify-between items-center p-4 bg-white shadow-sm">
      {/* Logo + Title */}
      <div className="flex flex-row items-center">
        <div className="p-4">
          <Image src={Logo} alt="Logo" height={50} width={50} />
        </div>
        <div className="flex flex-col p-4">
          <h1 className="text-xl font-bold text-blue-950">
            กองบัญชาการตํารวจสืบสวนสอบสวนอาชญากรรมทางเทคโนโลยี
          </h1>
          <p className="text-black font-bold">
            CYBER CRIME INVESTIGATION BUREAU
          </p>
        </div>
      </div>

      {/* Menu */}
      <div className="flex items-center gap-6 p-4">
        <Link href="/dashboard">
          <div
            className={`px-4 py-2 rounded-full text-sm font-bold cursor-pointer transition ${
              isActive("/dashboard")
                ? "bg-blue-800 text-white"
                : "text-black hover:text-blue-800"
            }`}
          >
            Dashboard
          </div>
        </Link>
        <Link href="/cases">
          <div
            className={`px-4 py-2 rounded-full text-sm font-bold cursor-pointer transition ${
              isActive("/cases")
                ? "bg-blue-800 text-white"
                : "text-black hover:text-blue-800"
            }`}
          >
            รายการคดี
          </div>
        </Link>

        {/* Avatar */}
        {session && (
          <Avatar>
            <AvatarImage src={""} />
            <AvatarFallback>NT</AvatarFallback>
          </Avatar>
        )}
        {!session && (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-black"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 2a5 5 0 00-3.536 8.536A7 7 0 003 17a1 1 0 001 1h12a1 1 0 001-1 7 7 0 00-3.464-6.464A5 5 0 0010 2zm-3 5a3 3 0 116 0 3 3 0 01-6 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
