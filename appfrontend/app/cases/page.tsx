"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, SlidersHorizontal, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// mock data
const mockCases = Array.from({ length: 12 }).map((_, i) => ({
  id: `T25071100012${34 + i}`,
  title: `คดีตัวอย่าง ${i + 1}`,
  victims: 100 + i * 10,
  damage: `${(1.2 + i * 0.1).toFixed(1)},000,000`,
  date: `11/0${(2 + (i % 6)).toString()}/68`,
  summary: `รายละเอียดของคดีตัวอย่างหมายเลข ${34 + i} ผู้เสียหายจำนวนมากตกเป็นเหยื่อการโจรกรรมข้อมูลและความเสียหายจำนวนมาก...`,
  rating: parseFloat((Math.random() * 4 + 1).toFixed(1)), // 1.0 - 5.0
}));

// ครึ่งดาว SVG
function HalfStar() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      className="w-5 h-5"
    >
      <defs>
        <linearGradient id="halfGrad">
          <stop offset="50%" stopColor="currentColor" />
          <stop offset="50%" stopColor="transparent" stopOpacity={1} />
        </linearGradient>
      </defs>
      <path
        fill="url(#halfGrad)"
        stroke="currentColor"
        strokeWidth="1"
        d="M12 .587l3.668 7.568L24 9.423l-6 5.845 1.417 8.25L12 19.771l-7.417 3.747L6 15.268 0 9.423l8.332-1.268z"
      />
    </svg>
  );
}

export default function CaseListPage() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="min-h-screen px-6 py-10 space-y-6 bg-[#F9F9FB]">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-blue-900">รายการคดี</h1>
        <Link
          href="/report"
          className="bg-white border border-gray-300 rounded-full w-9 h-9 flex items-center justify-center hover:bg-gray-100 shadow-sm transition"
          title="เพิ่มคดีใหม่"
        >
          <Plus className="w-5 h-5 text-gray-700" />
        </Link>
      </div>

      <div className="bg-[#ECEBF2] p-4 rounded-xl flex flex-col gap-4 shadow-md">
        <div className="flex items-center justify-between gap-2 w-full">
          <Input
            placeholder="หมายเลขคดี/ชื่อคดี"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-1/2 bg-white"
          />

          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full w-9 h-9 bg-white border border-gray-300 shadow-sm"
              >
                <SlidersHorizontal className="w-5 h-5 text-gray-700" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>ตัวกรอง</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block">วันที่บันทึกคดี</Label>
                  <div className="flex gap-2">
                    <Input placeholder="วัน" className="bg-white" />
                    <Input placeholder="เดือน" className="bg-white" />
                    <Input placeholder="ปี" className="bg-white" />
                  </div>
                </div>
                <div>
                  <Label className="mb-1 block">จำนวนผู้เสียหาย</Label>
                  <Input className="bg-white" />
                </div>
                <div>
                  <Label className="mb-1 block">มูลค่าความเสียหายโดยประมาณ (บาท)</Label>
                  <Input className="bg-white" />
                </div>
                <div>
                  <Label className="mb-1 block">ระดับความเสียหายต่อชื่อเสียง</Label>
                  <Select>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="เลือก" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">ต่ำ</SelectItem>
                      <SelectItem value="medium">ปานกลาง</SelectItem>
                      <SelectItem value="high">สูง</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block">การประเมินความเสี่ยง</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline">ข้อมูลสำคัญถูกละเมิด</Button>
                    <Button variant="outline">ภัยคุกคามที่ยังดำเนินอยู่</Button>
                    <Button variant="outline">ความเสี่ยงต่อการสูญหายของพยานหลักฐาน</Button>
                  </div>
                </div>
                <div>
                  <Label className="mb-1 block">ความชัดเจนของพยานหลักฐานเบื้องต้น</Label>
                  <Select>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="เลือก" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">ต่ำ</SelectItem>
                      <SelectItem value="medium">ปานกลาง</SelectItem>
                      <SelectItem value="high">สูง</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block">ระดับความซับซ้อนทางเทคนิค</Label>
                  <Select>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="เลือก" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">ต่ำ</SelectItem>
                      <SelectItem value="medium">ปานกลาง</SelectItem>
                      <SelectItem value="high">สูง</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline">รีเซ็ต</Button>
                <Button className="bg-blue-900 text-white">นำไปใช้</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-4 flex-wrap">
          <Select>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="ประเภทคดี" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="phishing">Phishing</SelectItem>
              <SelectItem value="scam">Scam</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="สาเหตุของคดี" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="money">Money</SelectItem>
              <SelectItem value="identity">Identity Theft</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="การเรียงข้อมูล" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">วันที่</SelectItem>
              <SelectItem value="damage">ความเสียหาย</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockCases.map((item, index) => (
          <Card key={index} className="bg-[#ECEBF2] p-4 space-y-2 rounded-xl">
            <CardContent className="space-y-2">
              <p className="font-bold text-sm text-gray-700">{item.id}</p>
              <p className="text-xl font-bold">{item.title}</p>
              <div className="flex justify-between text-sm text-red-700 font-semibold">
                <p>👥 {item.victims}</p>
                <p>฿ - {item.damage}</p>
                <p>📅 {item.date}</p>
              </div>
              <p className="text-sm text-gray-800 line-clamp-4">
                {item.summary}
              </p>
              <div className="flex gap-1 items-center">
                <p className="text-yellow-700 font-semibold">
                  {item.rating.toFixed(1)}
                </p>
                <div className="flex text-yellow-500 text-lg">
                  {(() => {
                    const fullStars = Math.floor(item.rating);
                    const hasHalfStar =
                      item.rating % 1 >= 0.25 && item.rating % 1 < 0.75;
                    const emptyStars =
                      5 - fullStars - (hasHalfStar ? 1 : 0);

                    return (
                      <>
                        {/* ดาวเต็ม */}
                        {Array.from({ length: fullStars }).map((_, i) => (
                          <Star key={`full-${i}`} fill="currentColor" stroke="none" />
                        ))}

                        {/* ครึ่งดาว */}
                        {hasHalfStar && <HalfStar />}

                        {/* ดาวว่าง */}
                        {Array.from({ length: emptyStars }).map((_, i) => (
                          <Star key={`empty-${i}`} stroke="currentColor" fill="none" />
                        ))}
                      </>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}//