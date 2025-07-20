"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, XCircle } from "lucide-react";
import { mockCases } from "@/app/mockCases";

interface CaseItem {
  id: string;
  case_number: string;
  case_name: string;
  timestamp: string;
  num_victims: number;
  estimated_financial_damage: number;
  description: string;
  priority_score: number;
  groupId?: string;
  isNew?: boolean; // ใช้ระบุคดีที่ต้องยืนยัน
  confirmed?: boolean;
}

export default function ReviewGroupPage() {
  const { groupId } = useParams();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("");

  useEffect(() => {
    // mock: จำลองให้มีคดีใหม่ 2 คดี (isNew=true)
    const groupCases = mockCases
      .filter((c) => c.groupId === groupId)
      .map((c, i) => ({
        ...c,
        isNew: i < 2, // สมมติ 2 คดีแรกเป็นคดีใหม่
        confirmed: false,
      }));
    setCases(groupCases);
  }, [groupId]);

  const handleAction = (caseId: string, action: "approve" | "reject") => {
    setCases((prev) =>
      prev
        .map((c) => {
          if (c.id !== caseId) return c;
          if (action === "approve") {
            return { ...c, isNew: false, confirmed: true }; // ยืนยัน → เปลี่ยนเป็นปกติ
          } else {
            return null; // ยกเลิก → ลบออก
          }
        })
        .filter((c): c is CaseItem => c !== null)
    );
  };

  const filtered = cases
    .filter(
      (c) =>
        c.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.case_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      } else if (sortBy === "damage") {
        return b.estimated_financial_damage - a.estimated_financial_damage;
      } else if (sortBy === "rating") {
        return b.priority_score - a.priority_score;
      }
      return 0;
    });

  return (
    <div className="min-h-screen px-6 py-8 space-y-6 bg-[#F9F9FB]">
      <h1 className="text-3xl font-bold text-blue-900 text-center">
        ตรวจสอบและยืนยันกลุ่มคดีที่เกี่ยวข้อง
      </h1>

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 bg-[#ECEBF2] p-4 rounded-xl shadow">
        <Input
          placeholder="หมายเลขรับแจ้ง/ชื่อคดี"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-white"
        />
        <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
          <SelectTrigger className="w-full sm:w-[250px] bg-white">
            <SelectValue placeholder="การจัดเรียงข้อมูล" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">วันที่</SelectItem>
            <SelectItem value="damage">ความเสียหาย</SelectItem>
            <SelectItem value="rating">คะแนนความสำคัญ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Case Cards */}
      {filtered.length === 0 ? (
        <p className="text-center text-gray-500">ไม่พบคดีในกลุ่มนี้</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl shadow space-y-2 relative transition
                ${item.isNew ? "bg-gray-200" : "bg-white"}`}
            >
              <p className="font-bold text-sm text-gray-700">{item.case_number}</p>
              <h2 className="text-xl font-bold">{item.case_name}</h2>
              <div className="flex justify-between text-sm text-red-700 font-semibold">
                <p>👥 {item.num_victims}</p>
                <p>฿ {item.estimated_financial_damage.toLocaleString()}</p>
                <p>{new Date(item.timestamp).toLocaleDateString("th-TH")}</p>
              </div>
              <p className="text-sm text-gray-700 line-clamp-4">
                {item.description || "ไม่มีรายละเอียด"}
              </p>

              {/* ปุ่มยืนยัน/ยกเลิก แสดงเฉพาะคดีใหม่ */}
              {item.isNew && (
                <div className="absolute bottom-3 right-3 flex gap-3">
                  <button
                    onClick={() => handleAction(item.id, "reject")}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleAction(item.id, "approve")}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700"
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
