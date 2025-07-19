"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, SlidersHorizontal } from "lucide-react";

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

const mockCases = Array.from({ length: 12 }).map((_, i) => ({
  id: `T25071100012${34 + i}`,
  title: `คดีตัวอย่าง ${i + 1}`,
  victims: 100 + i * 10,
  damage: `${(1.2 + i * 0.1).toFixed(1)},000,000`,
  date: `11/0${(2 + (i % 6)).toString()}/68`,
  summary: `รายละเอียดของคดีตัวอย่างหมายเลข ${34 + i} ผู้เสียหายจำนวนมากตกเป็นเหยื่อการโจรกรรมข้อมูลและความเสียหายจำนวนมาก...`,
  rating: 3 + (i % 3),
}));

export default function CaseListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cases, setCases] = useState<Case[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);


  // --- Data Fetching Logic ---
  const fetchCases = useCallback(async (page = 1, currentFilters = filters, currentSearch = searchTerm) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '12',
        ...currentFilters,
      });

      if (currentSearch) {
        params.append('q', currentSearch);
      }

      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001'}/cases?${params.toString()}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch cases: ${response.statusText}`);
      }

      const result = await response.json();
      setCases(result.data);
      setPagination(result.pagination);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []); // useCallback with empty dependency array

  // --- Effect for Initial Load and Filter Changes ---
  useEffect(() => {
    fetchCases(1, filters);
  }, [filters, fetchCases]);

  // --- Effect for Search Term with Debounce ---
  useEffect(() => {
    const timerId = setTimeout(() => {
      // Create a new filter object with the search term to trigger refetch
      const newFilters = { ...filters, q: searchTerm };
      fetchCases(1, {}, searchTerm);
    }, 500); // Debounce search by 500ms

    return () => clearTimeout(timerId);
  }, [searchTerm, fetchCases]);

  // --- Event Handlers for Filters ---
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    fetchCases(1, filters, searchTerm);
  };

  const handleResetFilters = () => {
    setFilters({});
    setSearchTerm("");
    fetchCases(1, {}, "");
  };

  if (error) return <div className="text-center p-10 text-red-500">Error: {error}</div>;

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
                  <Label>ประเภทคดี</Label>
                  <Select onValueChange={(value) => handleFilterChange('case_type', value)}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="ทั้งหมด" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hacking">Hacking</SelectItem>
                      <SelectItem value="Scam">Scam</SelectItem>
                      <SelectItem value="Phishing">Phishing</SelectItem>
                      <SelectItem value="Illegal Content">Illegal Content</SelectItem>
                      <SelectItem value="Cyberbullying">Cyberbullying</SelectItem>
                    </SelectContent>
                  </Select>
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
              <SelectItem value="Hacking">Hacking</SelectItem>
              <SelectItem value="scam">Scam</SelectItem>
              <SelectItem value="Phishing">Phishing</SelectItem>
              <SelectItem value="Illegal Content">Illegal Content</SelectItem>
              <SelectItem value="Cyberbullying">Cyberbullying</SelectItem>
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
                <p className="text-yellow-700 font-semibold">{item.rating.toFixed(1)}</p>
                <div className="text-yellow-500 text-lg">
                  {"⭐".repeat(Math.round(item.rating))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center items-center gap-2 pt-6">
        {[1, 2, 3, 4, 5].map((page) => (
          <Button
            key={page}
            size="icon"
            className={`rounded-full w-9 h-9 ${
              page === 1 ? "bg-blue-900 text-white" : "bg-white text-black"
            }`}
          >
            {page}
          </Button>
        ))}
      </div>
    </div>
  );
}//