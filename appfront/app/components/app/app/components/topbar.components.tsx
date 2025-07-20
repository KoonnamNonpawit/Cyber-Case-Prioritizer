"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Logo from "@/public/logo.png";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { mockCases } from "@/app/mockCases";

export const Topbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const session = null;

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const isActive = (path: string) => pathname === path;

  // ใช้ mockCases หา groupId มาทำแจ้งเตือน (สมมติ 2 กลุ่มแรก)
  useEffect(() => {
    const groups = mockCases
      .filter((c) => c.groupId)
      .map((c) => c.groupId)
      .filter((v, i, arr) => v && arr.indexOf(v) === i)
      .slice(0, 2);

    setNotifications(
      groups.map((gid, i) => ({
        id: i + 1,
        message: "พบคดีที่อาจเชื่อมโยงกัน",
        time: `${30 + i} นาทีที่ผ่านมา`,
        unread: true,
        groupId: gid,
      }))
    );
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleNotificationClick = (groupId: string, notifId: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, unread: false } : n))
    );
    setShowNotifications(false);
    router.push(`/review-group/${groupId}`);
  };

  return (
    <div className="relative flex flex-row justify-between items-center p-4 bg-white shadow-sm">
      {/* โลโก้และชื่อ */}
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

      {/* เมนู + แจ้งเตือน + Avatar */}
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

        {/* กระดิ่งแจ้งเตือน */}
        <div
          className="relative cursor-pointer"
          onClick={() => setShowNotifications(!showNotifications)}
        >
          <Bell
            className={`w-6 h-6 ${
              unreadCount > 0 ? "text-red-500" : "text-gray-400"
            }`}
          />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>

        {/* Avatar */}
        {session ? (
          <Avatar>
            <AvatarImage src={""} />
            <AvatarFallback>NT</AvatarFallback>
          </Avatar>
        ) : (
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

      {/* Dropdown การแจ้งเตือน */}
      {showNotifications && (
        <div className="absolute top-16 right-8 bg-white border rounded-lg shadow-lg w-80 p-4 z-50">
          <h3 className="text-lg font-bold mb-2">การแจ้งเตือน</h3>
          {notifications.length === 0 ? (
            <p className="text-gray-500">ไม่มีการแจ้งเตือน</p>
          ) : (
            <ul className="space-y-2">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  onClick={() => handleNotificationClick(n.groupId, n.id)}
                  className="flex justify-between items-start p-3 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">{n.message}</span>
                    <span className="text-sm text-gray-500">{n.time}</span>
                  </div>
                  <span className="text-red-500 text-lg">⚠</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
