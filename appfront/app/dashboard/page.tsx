"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Cell,
  Pie,
  Legend,
} from "recharts";
import Link from "next/link";
import { Star } from "lucide-react";
import { mockCases } from "@/app/mockCases";  // ใช้ mockCases

function getStarRating(score: number): number {
  if (score <= 0) return 0;
  return Math.round((score / 20) * 2) / 2;
}

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex text-yellow-500 text-lg">
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`full-${i}`} fill="currentColor" stroke="currentColor" className="w-5 h-5" />
      ))}
      {hasHalfStar && (
        <div className="relative w-5 h-5">
          <Star fill="currentColor" stroke="currentColor" className="w-5 h-5 absolute left-0" style={{ clipPath: "inset(0 50% 0 0)" }} />
          <Star stroke="currentColor" className="w-5 h-5 absolute left-0 text-gray-300" style={{ clipPath: "inset(0 0 0 50%)" }} />
        </div>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`empty-${i}`} stroke="currentColor" className="w-5 h-5 text-gray-300" />
      ))}
    </div>
  );
}

function fillWeeklyData() {
  const today = new Date();
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const label = d.toLocaleDateString("th-TH", { weekday: "short" });
    return { day: label, value: Math.floor(Math.random() * 10) + 1 };
  });
}

const chartColors = ["#632D9C", "#BC298C", "#F24B72", "#F9F871", "#FF7F6A", "#FFBA5B"];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  const total_cases = mockCases.length;
  const pending_cases = mockCases.filter(c => c.status === "รับเรื่อง").length;
  const in_progress_cases = mockCases.filter(c => c.status === "กำลังสืบสวน").length;
  const completed_cases = mockCases.filter(c => c.status === "ปิดคดี").length;
  const cases_today = Math.floor(Math.random() * 5);

  const caseTypes = Array.from(
    mockCases.reduce((map, c) => map.set(c.case_type, (map.get(c.case_type) || 0) + 1), new Map())
  ).map(([name, value]) => ({ name, value }));

  const topCases = [...mockCases]
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 5)
    .map(c => ({
      id: c.id,
      case_number: c.case_number,
      title: c.case_name,
      victims: c.num_victims,
      damage: c.estimated_financial_damage.toLocaleString(),
      date: new Date(c.timestamp).toLocaleDateString("th-TH"),
      summary: c.description,
      rating: getStarRating(c.priority_score),
    }));

  const accountCountMap = new Map<string, number>();
  mockCases.forEach(c => {
    accountCountMap.set(c.account_number, (accountCountMap.get(c.account_number) || 0) + 1);
  });
  const topAccounts = Array.from(accountCountMap.entries())
    .map(([account, count]) => ({ account, caseCount: count }))
    .sort((a, b) => b.caseCount - a.caseCount)
    .slice(0, 5);

  const weeklyData = fillWeeklyData();

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <div className="flex justify-center items-center h-screen">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen space-y-10 pb-10">
      {/* Summary */}
      <div className="max-w-7xl mx-auto p-4 space-y-6 bg-[#ECEBF2] rounded-xl">
        <h1 className="text-3xl font-bold text-blue-900">Dashboard</h1>

        <div className="grid grid-cols-4 gap-4">
          {[
            { title: "จำนวนคดีทั้งหมด", value: total_cases },
            { title: "คดีรับเรื่อง", value: pending_cases },
            { title: "คดีกำลังสืบสวน", value: in_progress_cases },
            { title: "คดีปิดแล้ว", value: completed_cases },
          ].map((stat, i) => (
            <Card key={i} className={`p-4 ${i === 0 ? "bg-gradient-to-r from-blue-800 to-blue-400 text-white" : "bg-white"}`}>
              <CardContent>
                <p className="text-lg font-semibold">{stat.title}</p>
                <p className="text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="col-span-1 bg-white">
            <CardHeader><CardTitle>สถิติประเภทคดี</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={caseTypes} dataKey="value" nameKey="name" outerRadius={110}>
                    {caseTypes.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="col-span-2 bg-white">
            <CardHeader><CardTitle>สถิติคดีรายเดือน (mock)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={[{ month: "2025-07", Hacking: 5, Scam: 8 }]}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Hacking" stackId="a" fill={chartColors[0]} />
                  <Bar dataKey="Scam" stackId="a" fill={chartColors[1]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Weekly */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="col-span-2 bg-white">
            <CardHeader><CardTitle>จำนวนคดี 7 วันล่าสุด (mock)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#D9D9D9" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="col-span-1 p-4 bg-gradient-to-r from-blue-800 to-blue-400 text-white flex flex-col items-center justify-center">
            <p className="text-lg font-semibold">คดีใหม่วันนี้</p>
            <p className="text-5xl font-bold">{cases_today}</p>
          </Card>
        </div>
      </div>

      {/* Top 5 Cases */}
      <div className="max-w-7xl mx-auto px-4">
        <Card className="bg-[#ECEBF2] shadow rounded-xl">
          <CardHeader><CardTitle>5 อันดับคดีสำคัญ</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-4 overflow-x-auto">
              {topCases.map((c, idx) => (
                <Card key={idx} className="bg-white p-4 min-w-[300px] rounded-xl shadow hover:ring-2 hover:ring-blue-500">
                  <Link href={`/cases/${c.case_number}`}>
                    <CardContent className="space-y-2">
                      <p className="text-sm font-semibold">{c.case_number}</p>
                      <p className="text-lg font-bold">{c.title}</p>
                      <div className="flex justify-between text-sm text-red-700">
                        <span>👥 {c.victims}</span>
                        <span>฿ {c.damage}</span>
                        <span>{c.date}</span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-3">{c.summary}</p>
                      <div className="flex gap-2 items-center">
                        <span className="text-yellow-700 font-bold">{c.rating.toFixed(1)}</span>
                        <StarRating rating={c.rating} />
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Accounts */}
      <div className="max-w-7xl mx-auto px-4">
        <Card className="bg-[#ECEBF2] shadow rounded-xl">
          <CardHeader>
            <CardTitle className="text-center text-xl font-bold">
              5 บัญชีธนาคารที่พบในคดีบ่อยที่สุด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-6">
              {topAccounts[0] && (
                <div className="flex items-center gap-4 px-8 py-4 rounded-full shadow-lg bg-white">
                  <div className="flex items-center justify-center rounded-full text-white font-bold bg-[#1C254F]"
                       style={{ width: "60px", height: "60px", fontSize: "1.8rem" }}>
                    1
                  </div>
                  <div className="flex flex-col text-center">
                    <span className="font-bold text-2xl">{topAccounts[0].account}</span>
                    <span className="text-gray-600 text-base">พบใน {topAccounts[0].caseCount} คดี</span>
                  </div>
                </div>
              )}

              {/* อันดับ 2–5 */}
              <div className="flex flex-wrap justify-center gap-4">
                {topAccounts.slice(1).map((acc, idx) => {
                  const colors = ["#273880", "#515AA7", "#797ED0", "#A2A5FA"];
                  const rankColor = colors[idx] || "#A2A5FA";
                  return (
                    <div key={acc.account}
                         className="flex items-center gap-3 px-6 py-3 rounded-full shadow bg-white">
                      <div className="flex items-center justify-center rounded-full text-white font-bold"
                           style={{ backgroundColor: rankColor, width: "40px", height: "40px", fontSize: "1rem" }}>
                        {idx + 2}
                      </div>
                      <div className="flex flex-col text-center">
                        <span className="font-bold text-base">{acc.account}</span>
                        <span className="text-gray-600 text-sm">พบใน {acc.caseCount} คดี</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
