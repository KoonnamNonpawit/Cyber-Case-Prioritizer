"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, SlidersHorizontal, Star, StarHalf, StarOff } from "lucide-react";
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

interface Case {
  id: string;
  case_number: string;
  case_name: string;
  num_victims: number;
  estimated_financial_damage: number;
  timestamp: string;
  description: string;
  priority_score: number;
  status: string;
  case_type: string;
}

interface Pagination {
  page: number;
  limit: number;
  total_records: number;
  total_pages: number;
}

export default function CaseListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cases, setCases] = useState<Case[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchCases = useCallback(
    async (page = 1, currentFilters = filters, currentSearch = searchTerm) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "12",
          ...currentFilters,
        });
        if (currentSearch) params.append("q", currentSearch);

        const apiUrl = `${
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001"
        }/cases?${params.toString()}`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`Failed: ${response.statusText}`);

        const result = await response.json();
        setCases(result.data);
        setPagination(result.pagination);
        setCurrentPage(page);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [filters, searchTerm]
  );

  useEffect(() => {
    fetchCases(1, filters);
  }, [filters, fetchCases]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      fetchCases(1, filters, searchTerm);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm, filters, fetchCases]);

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
  {/* Search */}
  <div className="flex items-center gap-3">
    <Input
      placeholder="หมายเลขคดี/ชื่อคดี"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="flex-1 bg-white"
    />
  </div>

  {/* Dropdown Filters */}
  <div className="flex flex-wrap gap-3 items-center">
    {/* ประเภทคดี */}
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

    {/* สถานะคดี */}
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

    {/* การเรียงข้อมูล */}
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

    {/* ปุ่มล้างตัวกรอง */}
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
          <Card key={item.id} className="bg-[#ECEBF2] p-4 space-y-2 rounded-xl">
            <CardContent className="space-y-2">
              <p className="font-bold text-sm text-gray-700">{item.case_number}</p>
              <p className="text-xl font-bold">{item.case_name}</p>
              <div className="flex justify-between text-sm text-red-700 font-semibold">
                <p>👥 {item.num_victims ?? 0}</p>
                <p>฿ {item.estimated_financial_damage ?? 0}</p>
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
