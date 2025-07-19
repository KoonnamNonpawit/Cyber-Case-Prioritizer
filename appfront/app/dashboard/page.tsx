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

interface ApiDashboardStats {
  summary_stats: {
    total_cases: number;
    pending_cases: number;
    in_progress_cases: number;
    completed_cases: number;
    cases_today: number;
  };
  cases_by_type: Record<string, number>;
  monthly_case_breakdown: Record<string, Record<string, number>>;
  top_5_priority_cases: {
    id: string;
    case_number: string;
    case_name: string;
    description: string | null;
    timestamp: string;
    num_victims: number;
    estimated_financial_damage: number;
    priority_score: number;
  }[];
  cases_last_7_days: {
    day: string;
    count: number;
  }[];
}

interface MonthlyChartData {
  month: string;
  [key: string]: string | number;
}

interface TransformedStats {
  summaryStats: { title: string; value: number }[];
  casesToday: number;
  caseTypes: { name: string; value: number }[];
  monthlyData: MonthlyChartData[];
  weeklyData: { day: string; value: number }[];
  topCases: {
    id: string;
    case_number: string;
    title: string;
    victims: number;
    damage: string;
    date: string;
    summary: string | null;
    rating: number;
  }[];
}

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

function fillWeeklyData(data: { day: string; count: number }[]) {
  const today = new Date();
  const daysOfWeek = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const key = d.toISOString().split("T")[0];
    return { key, label: d.toLocaleDateString("th-TH", { weekday: "short" }) };
  });

  return daysOfWeek.map((day) => {
    const found = data.find((d) => d.day === day.key);
    return { day: day.label, value: found ? found.count : 0 };
  });
}

const chartColors = ["#632D9C", "#BC298C", "#F24B72", "#F9F871", "#FF7F6A", "#FFBA5B"];

export default function DashboardPage() {
  const [stats, setStats] = useState<TransformedStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001"}/dashboard`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data: ApiDashboardStats = await response.json();

        const transformedData: TransformedStats = {
          summaryStats: [
            { title: "จำนวนคดีทั้งหมด", value: data.summary_stats.total_cases },
            { title: "คดีรับเรื่อง", value: data.summary_stats.pending_cases },
            { title: "คดีกำลังสืบสวน", value: data.summary_stats.in_progress_cases },
            { title: "คดีปิดแล้ว", value: data.summary_stats.completed_cases },
          ],
          casesToday: data.summary_stats.cases_today,
          caseTypes: Object.entries(data.cases_by_type).map(([name, value]) => ({ name, value })),
          monthlyData: Object.entries(data.monthly_case_breakdown).map(([month, types]) => ({
            month,
            ...(types as Record<string, number>),
          })),
          weeklyData: fillWeeklyData(data.cases_last_7_days),
          topCases: data.top_5_priority_cases.map((caseItem) => ({
            id: caseItem.id,
            case_number: caseItem.case_number,
            title: caseItem.case_name,
            victims: caseItem.num_victims,
            damage: caseItem.estimated_financial_damage.toLocaleString(),
            date: new Date(caseItem.timestamp).toLocaleDateString("th-TH"),
            summary: caseItem.description,
            rating: getStarRating(caseItem.priority_score),
          })),
        };

        setStats(transformedData);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-screen">Loading Dashboard...</div>;
  if (error) return <div className="flex justify-center items-center h-screen text-red-500">Error: {error}</div>;
  if (!stats) return <div className="flex justify-center items-center h-screen">No data available.</div>;

  return (
    <div className="min-h-screen space-y-10 pb-10">
      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto p-4 space-y-6 bg-[#ECEBF2] rounded-xl">
        <h1 className="text-3xl font-bold text-blue-900">Dashboard</h1>

        <div className="grid grid-cols-4 gap-4">
          {stats.summaryStats.map((stat, i) => (
            <Card
              key={i}
              className={`p-4 ${i === 0 ? "bg-gradient-to-r from-blue-800 to-blue-400 text-white" : "bg-[#ffffff]"}`}
            >
              <CardContent>
                <p className="text-lg font-semibold">{stat.title}</p>
                <p className="text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-3 gap-4">
          {/* Pie Chart */}
          <Card className="col-span-1 bg-[#ffffff]">
            <CardHeader>
              <CardTitle>สถิติประเภทคดี</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={stats.caseTypes} dataKey="value" nameKey="name" outerRadius={110}>
                    {stats.caseTypes.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Bar Chart */}
          <Card className="col-span-2 bg-[#ffffff]">
            <CardHeader>
              <CardTitle>สถิติคดีที่รับแจ้งรายเดือน (แยกตามประเภท)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.monthlyData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {Object.keys(stats.monthlyData[0] || {})
                    .filter((k) => k !== "month")
                    .map((key, index) => (
                      <Bar key={key} dataKey={key} stackId="a" fill={chartColors[index % chartColors.length]} name={key} />
                    ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Chart + Cases Today */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="col-span-2 bg-[#ffffff]">
            <CardHeader>
              <CardTitle>จำนวนคดีที่รับแจ้งใน 7 วันล่าสุด</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.weeklyData}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#D9D9D9" activeBar={{ fill: "#FFD700" }} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="col-span-1 p-4 bg-gradient-to-r from-blue-800 to-blue-400 text-white flex flex-col items-center justify-center">
            <p className="text-lg font-semibold">คดีใหม่วันนี้</p>
            <p className="text-5xl font-bold">{stats.casesToday}</p>
          </Card>
        </div>
      </div>

      {/* Top 5 Cases */}
      <div className="max-w-7xl mx-auto px-4">
        <Card className="bg-[#ECEBF2] shadow rounded-xl">
          <CardHeader>
            <CardTitle>5 อันดับคดีสำคัญ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="flex gap-4 w-max">
                {stats.topCases.map((caseItem, idx) => (
                  <Card
                    key={`${caseItem.case_number}-${idx}`} 
                    className="bg-white shadow-md p-4 min-w-[300px] rounded-xl hover:ring-2 hover:ring-blue-500"
                  >
                    <Link href={`/cases/${caseItem.case_number}`}>
                      <CardContent className="space-y-2">
                        <p className="text-sm font-semibold">{caseItem.case_number}</p>
                        <p className="text-lg font-bold">{caseItem.title}</p>
                        <div className="flex justify-between text-sm text-red-700">
                          <span>👥 {caseItem.victims}</span>
                          <span>฿ {caseItem.damage}</span>
                          <span>{caseItem.date}</span>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-3">
                          {caseItem.summary || "ไม่มีรายละเอียดเพิ่มเติม"}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-700 font-bold">{caseItem.rating.toFixed(1)}</span>
                          <StarRating rating={caseItem.rating} />
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
