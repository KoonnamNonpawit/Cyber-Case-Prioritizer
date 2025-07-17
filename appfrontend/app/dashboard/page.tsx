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
  daily_cases_last_7_days: {
    day: string;
    count: number;
  }[];
}

interface MonthlyChartData {
  month: string;
  [key: string]: string | number; // Allows 'month' to be a string, and all other keys to have string or number values.
}

interface TransformedStats {
  summaryStats: { title: string; value: number }[];
  casesToday: number;
  caseTypes: { name: string; value: number }[];
  monthlyData: MonthlyChartData[];
  weeklyData: { day: string; value: number }[];
  topCases: {
    id: string;
    title: string;
    victims: number;
    damage: string;
    date: string;
    summary: string | null;
    rating: number;
  }[];
}

function getStarRating(score: number): number {
  if (score <= 0) return 1;
  return Math.ceil(score / 20);
}


export default function DashboardPage() {

  const [stats, setStats] = useState<TransformedStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001'}/dashboard`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: ApiDashboardStats = await response.json();

        console.log(data);

        const transformedData: TransformedStats = {
          summaryStats: [
            { title: "จำนวนคดีทั้งหมด", value: data.summary_stats.total_cases },
            { title: "คดีรับเรื่อง", value: data.summary_stats.pending_cases },
            { title: "คดีกำลังสืบสวน", value: data.summary_stats.in_progress_cases },
            { title: "คดีปิดแล้ว", value: data.summary_stats.completed_cases },
          ],
          casesToday: data.summary_stats.cases_today,
          caseTypes: Object.entries(data.cases_by_type).map(([name, value]) => ({ name, value })),
          monthlyData: Object.entries(data.monthly_case_breakdown).map(([month, types]) => ({ month, ...(types as Record<string, number>) })),
          weeklyData: data.daily_cases_last_7_days.map(item => ({
            day: new Date(item.day).toLocaleDateString('th-TH', { weekday: 'short' }),
            value: item.count
          })),
          topCases: data.top_5_priority_cases.map(caseItem => ({
            id: caseItem.id,
            title: caseItem.case_name,
            victims: caseItem.num_victims,
            damage: caseItem.estimated_financial_damage.toLocaleString(),
            date: new Date(caseItem.timestamp).toLocaleDateString('th-TH'),
            summary: caseItem.description,
            rating: getStarRating(caseItem.priority_score)
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

  // --- Dynamic Bar components for Monthly Chart ---
  const allCaseTypesForMonthlyChart = stats.monthlyData.reduce<string[]>((acc, monthData) => {
    Object.keys(monthData).forEach(key => {
      if (key !== 'month' && !acc.includes(key)) acc.push(key);
    });
    return acc;
  }, []);
  const COLORS = ["#273880", "#2A3FA3", "#365EDA", "#4B7BE6", "#6D9DED", "#86B5F2"];

  return (
    <div className="min-h-screen space-y-10 pb-10">
      <div className="max-w-7xl mx-auto p-4 space-y-6 bg-[#ECEBF2] rounded-xl">
        <h1 className="text-3xl font-bold text-blue-900">Dashboard</h1>

        <div className="grid grid-cols-4 gap-4">
          {stats.summaryStats.map((stat, i) => (
            <Card
              key={i}
              className={`p-4 ${i === 0
                ? "bg-gradient-to-r from-blue-800 to-blue-400 text-white"
                : "bg-[#ffffff]"
                }`}
            >
              <CardContent>
                <p className="text-lg font-semibold">{stat.title}</p>
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-sm">{i === 0 ? "ข้อมูลล่าสุดเมื่อ 2 วันที่แล้ว" : ""}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="col-span-1 bg-[#ffffff]">
            <CardHeader>
              <CardTitle>สถิติประเภทคดี</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={stats.caseTypes} dataKey="value" nameKey="name" outerRadius={120}>
                    {stats.caseTypes.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={["#273880", "#2A3FA3", "#365EDA", "#4B7BE6", "#6D9DED"][index % 5]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

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
                  <Bar dataKey="phishing" stackId="a" fill="#273880" name="Phishing" />
                  <Bar dataKey="scam" stackId="a" fill="#2A3FA3" name="Scam" />
                  <Bar dataKey="hacking" stackId="a" fill="#365EDA" name="Hacking" />
                  <Bar dataKey="cyberbullying" stackId="a" fill="#4B7BE6" name="Cyberbullying" />
                  <Bar dataKey="other" stackId="a" fill="#6D9DED" name="Other" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Chart + New Cases Today */}
        <div className="grid grid-cols-3 gap-4">


          {/* 📊 BarChart 7 วัน */}
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

          <Card className="col-span-1 p-4 bg-gradient-to-r from-blue-800 to-blue-400 text-white">
            <CardHeader>
              <CardTitle>คดีใหม่วันนี้</CardTitle>
            </CardHeader>
            <CardContent className="relative flex flex-col items-center justify-center h-[140px] text-center">
              <p className="text-5xl font-bold">123</p>
              <p className="absolute bottom-2 left-4 text-xs text-white/80">ข้อมูลล่าสุดเมื่อ 2 วันที่แล้ว</p>
            </CardContent>
          </Card>


        </div>

      </div>

      <div className="max-w-7xl mx-auto px-4">
        <Card className="bg-[#ECEBF2] shadow rounded-xl">
          <CardHeader>
            <CardTitle>5 อันดับคดีสำคัญ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="flex gap-4 w-max">
                {stats.topCases.map((caseItem) => (
                  <Card
                    key={caseItem.id}
                    asChild
                    className="bg-white shadow-md p-4 min-w-[300px] hover:ring-2 hover:ring-blue-500 rounded-xl cursor-pointer transition"
                  >
                    <Link href={`/cases/${caseItem.id}`}>
                      <CardContent className="space-y-2">
                        <p className="text-sm font-semibold">{caseItem.id}</p>
                        <p className="font-bold text-blue-900">{caseItem.title}</p>
                        <p className="text-sm text-gray-600">
                          📄 {caseItem.victims} 👛 {caseItem.damage} 📅 {caseItem.date}
                        </p>
                        <p className="text-sm text-gray-700">{caseItem.summary}</p>
                        <div className="text-yellow-500 text-lg">
                          {"⭐".repeat(caseItem.rating)}
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
