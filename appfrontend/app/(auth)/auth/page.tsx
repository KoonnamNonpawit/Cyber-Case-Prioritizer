"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInAction } from "./_actions/app/app/(auth)/auth/_actions/sign-in";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AuthPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const session = null; // <- เปลี่ยนตรงนี้ในอนาคตเมื่อใช้ระบบ auth จริง

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("กรุณากรอกอีเมลและรหัสผ่านให้ครบ");
      return;
    }

    try {
      const response = await signInAction({ email, password });
      if (response?.ok || response?.status === "success") {
        router.push("/dashboard");
      } else {
        alert("อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
      console.error(error);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-white min-h-screen">
      <Card className="w-full max-w-lg p-6 bg-gray-200 shadow-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-blue-900 text-xl font-bold">
            เข้าสู่ระบบ
          </CardTitle>
          <CardDescription className="text-black font-bold text-2xl">
            ระบบจัดการคดีอาชญากรรมทางไซเบอร์
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="font-bold">
              อีเมล
            </Label>
            <Input
              className="bg-white"
              type="email"
              id="email"
              placeholder="กรุณากรอกอีเมล"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="font-bold">
              รหัสผ่าน
            </Label>
            <Input
              className="bg-white"
              type="password"
              id="password"
              placeholder="กรุณากรอกรหัสผ่าน"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
          >
            เข้าสู่ระบบ
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
