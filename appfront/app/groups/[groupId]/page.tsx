"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ใช้ mockCases กลาง (30 คดี) จาก app/mockCases.ts
import { mockCases, Case as GroupCase } from "@/app/mockCases";

// ฟังก์ชันหาวันคดีแรก-ล่าสุดในกลุ่ม
const getDateRange = (caseList: GroupCase[]) => {
  if (caseList.length === 0) return { first: "-", last: "-" };

  const sorted = [...caseList].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const first = new Date(sorted[0].timestamp).toLocaleDateString("th-TH");
  const last = new Date(sorted[sorted.length - 1].timestamp).toLocaleDateString("th-TH");
  return { first, last };
};

export default function GroupCasesPage() {
  const params = useParams();
  const { groupId } = params;

  const [cases, setCases] = useState<GroupCase[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("");

  useEffect(() => {
    // กรองคดีตาม groupId
    let data = mockCases.filter((c) => c.groupId === groupId);

    // ค้นหาด้วยหมายเลขคดีหรือชื่อคดี
    if (searchTerm) {
      data = data.filter(
        (c) =>
          c.case_number.includes(searchTerm) ||
          c.case_name.includes(searchTerm)
      );
    }

    // การเรียงลำดับ
    if (sortBy === "date") {
      data = data.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } else if (sortBy === "damage") {
      data = data.sort(
        (a, b) => b.estimated_financial_damage - a.estimated_financial_damage
      );
    } else if (sortBy === "rating") {
      data = data.sort((a, b) => b.priority_score - a.priority_score);
    }

    setCases(data);
  }, [groupId, searchTerm, sortBy]);

  const { first, last } = getDateRange(cases);

  return (
    <div className="min-h-screen px-6 py-8 space-y-6 bg-[#F9F9FB]">
      {/* Group Header */}
      <div className="flex flex-col space-y-3">
        <h1 className="text-3xl font-bold text-blue-900">{groupId}</h1>
        <div className="flex gap-2">
          <span className="bg-[#ECEBF2] px-4 py-1 rounded-full text-sm">
            คดีแรก: {first}
          </span>
          <span className="bg-[#ECEBF2] px-4 py-1 rounded-full text-sm">
            คดีล่าสุด: {last}
          </span>
        </div>
      </div>

      {/* Search + Sort Bar */}
      <div className="flex flex-col gap-3 bg-[#ECEBF2] p-4 rounded-xl shadow">
        <Input
          placeholder="หมายเลขรับแจ้ง/ชื่อคดี"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-white"
        />
        <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
          <SelectTrigger className="w-full sm:w-[250px] bg-white">
            <SelectValue placeholder="การจัดเรียงข้อมูลคดี" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">วันที่</SelectItem>
            <SelectItem value="damage">ความเสียหาย</SelectItem>
            <SelectItem value="rating">คะแนนความสำคัญ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Case Cards */}
      {cases.length === 0 ? (
        <p className="text-center text-gray-500">ไม่พบคดีในกลุ่มนี้</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map((item) => (
            <div
              key={item.id}
              className="bg-white p-4 rounded-xl shadow space-y-2"
            >
              <p className="font-bold text-sm text-gray-700">{item.case_number}</p>
              <h2 className="text-xl font-bold">{item.case_name}</h2>
              <div className="flex justify-between text-sm text-red-700 font-semibold">
                <p>👥 {item.num_victims}</p>
                <p>฿ {item.estimated_financial_damage.toLocaleString()}</p>
                <p>{new Date(item.timestamp).toLocaleDateString("th-TH")}</p>
              </div>
              <p className="text-sm text-gray-700 line-clamp-3">{item.description}</p>
              <div className="flex gap-1 items-center mt-2">
                <p className="text-yellow-700 font-semibold">
                  {((item.priority_score / 100) * 5).toFixed(1)} / 5
                </p>
                <div className="flex text-yellow-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i}>
                      {i < Math.round((item.priority_score / 100) * 5)
                        ? "★"
                        : "☆"}
                    </span>
                  ))}
                </div>
              </div>
              <Link href={`/cases/${item.id}`}>
                <button className="mt-3 px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                  ดูรายละเอียด
                </button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
