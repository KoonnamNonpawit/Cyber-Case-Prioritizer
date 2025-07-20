"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Star,
  StarHalf,
  StarOff,
  Layers,
} from "lucide-react";
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

import { mockCases, Case } from "@/app/mockCases";

interface Pagination {
  page: number;
  limit: number;
  total_records: number;
  total_pages: number;
}

export default function CaseListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cases, setCases] = useState<Case[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 12,
    total_records: mockCases.length,
    total_pages: Math.ceil(mockCases.length / 12),
  });
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // ฟังก์ชันดึงข้อมูลจาก mockCases
  const fetchCases = (page = 1, currentFilters = filters, currentSearch = searchTerm) => {
    setLoading(true);
    setError(null);

    try {
      let data = [...mockCases];

      // ค้นหา
      if (currentSearch) {
        data = data.filter(
          (c) =>
            c.case_number.includes(currentSearch) ||
            c.case_name.includes(currentSearch)
        );
      }

      // ตัวกรอง
      if (currentFilters.case_type) {
        data = data.filter((c) => c.case_type === currentFilters.case_type);
      }
      if (currentFilters.status) {
        data = data.filter((c) => c.status === currentFilters.status);
      }

      // การเรียงลำดับ
      if (currentFilters.sort_by === "priority") {
        data = data.sort((a, b) => b.priority_score - a.priority_score);
      } else if (currentFilters.sort_by === "date") {
        data = data.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      } else if (currentFilters.sort_by === "damage") {
        data = data.sort((a, b) => b.estimated_financial_damage - a.estimated_financial_damage);
      }

      // แบ่งหน้า
      const start = (page - 1) * 12;
      const end = start + 12;
      const paginated = data.slice(start, end);

      setCases(paginated);
      setPagination({
        page,
        limit: 12,
        total_records: data.length,
        total_pages: Math.ceil(data.length / 12),
      });
      setCurrentPage(page);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases(1, filters);
  }, [filters]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      fetchCases(1, filters, searchTerm);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({});
    setSearchTerm("");
    fetchCases(1, {}, "");
  };

  const handlePageChange = (page: number) => {
    fetchCases(page, filters, searchTerm);
  };

  if (loading) return <div className="p-10 text-center">กำลังโหลดข้อมูล...</div>;
  if (error) return <div className="p-10 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen px-6 py-10 space-y-6 bg-[#F9F9FB]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-blue-900">รายการคดี</h1>
        <Link
          href="/report"
          className="bg-white border border-gray-300 rounded-full w-9 h-9 flex items-center justify-center hover:bg-gray-100 shadow-sm"
          title="เพิ่มคดีใหม่"
        >
          <Plus className="w-5 h-5 text-gray-700" />
        </Link>
      </div>

      {/* Search + Filter Bar */}
      <div className="bg-[#ECEBF2] p-4 rounded-xl shadow-md space-y-3">
        <div className="flex items-center gap-3">
          <Input
            placeholder="หมายเลขคดี/ชื่อคดี"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-white"
          />
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Select
            value={filters.case_type || ""}
            onValueChange={(v) => handleFilterChange("case_type", v)}
          >
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="ประเภทของคดี" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Hacking">Hacking</SelectItem>
              <SelectItem value="Scam">Scam</SelectItem>
              <SelectItem value="Phishing">Phishing</SelectItem>
              <SelectItem value="Illegal Content">Illegal Content</SelectItem>
              <SelectItem value="Cyberbullying">Cyberbullying</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.status || ""}
            onValueChange={(v) => handleFilterChange("status", v)}
          >
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="สถานะของคดี" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="รับเรื่อง">รับเรื่อง</SelectItem>
              <SelectItem value="กำลังสืบสวน">กำลังสืบสวน</SelectItem>
              <SelectItem value="ปิดคดี">ปิดคดี</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.sort_by || ""}
            onValueChange={(v) => handleFilterChange("sort_by", v)}
          >
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="การจัดเรียงข้อมูล" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">คะแนนความสำคัญ</SelectItem>
              <SelectItem value="date">วันที่</SelectItem>
              <SelectItem value="damage">ความเสียหาย</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="ml-auto text-sm"
            onClick={handleResetFilters}
          >
            ล้างตัวกรอง
          </Button>
        </div>
      </div>

      {/* Case Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cases.map((item) => (
          <Card
            key={item.id}
            className="bg-[#ECEBF2] p-4 space-y-2 rounded-xl relative hover:ring-2 hover:ring-blue-400 transition"
          >
            {/* ปุ่มกลุ่ม (ยังคงทำงาน) */}
            {item.groupId && (
              <Link href={`/groups/${item.groupId}`} title="ดูคดีในกลุ่มเดียวกัน">
                <Layers className="absolute top-3 right-3 w-5 h-5 text-gray-600 hover:text-blue-700 cursor-pointer" />
              </Link>
            )}

            {/* คลิกการ์ดไปหน้ารายละเอียดคดี */}
            <Link href={`/cases/${item.case_number}`}>
              <CardContent className="space-y-2 cursor-pointer">
                <p className="font-bold text-sm text-gray-700">{item.case_number}</p>
                <p className="text-xl font-bold">{item.case_name}</p>
                <div className="flex justify-between text-sm text-red-700 font-semibold">
                  <p>👥 {item.num_victims ?? 0}</p>
                  <p>฿ {item.estimated_financial_damage.toLocaleString()}</p>
                  <p>📅 {new Date(item.timestamp).toLocaleDateString("th-TH")}</p>
                </div>
                <p className="text-sm text-gray-800 line-clamp-4">
                  {item.description || "ไม่มีรายละเอียด"}
                </p>
                <div className="flex gap-1 items-center">
                  {(() => {
                    const rawScore = item.priority_score || 0;
                    const starScore = Math.min(5, (rawScore / 100) * 5);
                    const fullStars = Math.floor(starScore);
                    const hasHalf = starScore - fullStars >= 0.25 && starScore - fullStars < 0.75;
                    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
                    return (
                      <>
                        <p className="text-yellow-700 font-semibold">
                          {starScore.toFixed(1)} / 5
                        </p>
                        <div className="flex text-yellow-500 ml-2">
                          {[...Array(fullStars)].map((_, i) => (
                            <Star key={`full-${i}`} className="w-4 h-4 fill-yellow-500" />
                          ))}
                          {hasHalf && <StarHalf className="w-4 h-4 fill-yellow-500" />}
                          {[...Array(emptyStars)].map((_, i) => (
                            <StarOff key={`empty-${i}`} className="w-4 h-4 text-gray-400" />
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-2 pt-6">
        {pagination &&
          Array.from({ length: pagination.total_pages }).map((_, idx) => {
            const page = idx + 1;
            return (
              <Button
                key={page}
                size="icon"
                onClick={() => handlePageChange(page)}
                className={`rounded-full w-9 h-9 ${
                  page === currentPage
                    ? "bg-blue-900 text-white"
                    : "bg-white text-black"
                }`}
              >
                {page}
              </Button>
            );
          })}
      </div>
    </div>
  );
}
