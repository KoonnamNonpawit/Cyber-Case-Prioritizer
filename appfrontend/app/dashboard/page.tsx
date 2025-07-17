"use client";

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

const summaryStats = [
  { title: "จำนวนคดีทั้งหมด", value: 123 },
  { title: "คดีที่ต้องดำเนินการ", value: 123 },
  { title: "คดีกำลังดำเนินการ", value: 123 },
  { title: "คดีเสร็จสิ้น", value: 123 },
];

const caseTypes = [
  { name: "Phishing", value: 35 },
  { name: "Scam", value: 25 },
  { name: "Hacking", value: 20 },
  { name: "Cyberbullying", value: 10 },
  { name: "Other", value: 8 },
];

const monthlyData = [
  { month: "ม.ค.", phishing: 120, scam: 40, hacking: 40, cyberbullying: 100, other: 10 },
  { month: "ก.พ.", phishing: 180, scam: 70, hacking: 50, cyberbullying: 100, other: 10 },
  { month: "มี.ค.", phishing: 200, scam: 100, hacking: 100, cyberbullying: 100, other: 10 },
  { month: "เม.ย.", phishing: 150, scam: 120, hacking: 80, cyberbullying: 100, other: 10 },
  { month: "พ.ค.", phishing: 220, scam: 160, hacking: 120, cyberbullying: 100, other: 10 },
  { month: "มิ.ย.", phishing: 280, scam: 180, hacking: 140, cyberbullying: 100, other: 10 },
  { month: "ก.ค.", phishing: 200, scam: 150, hacking: 100, cyberbullying: 100, other: 10 },
];

const weeklyData = [
  { day: "จ", value: 10 },
  { day: "อ", value: 20 },
  { day: "พ", value: 25 },
  { day: "พฤ", value: 30 },
  { day: "ศ", value: 40 },
  { day: "ส", value: 35 },
  { day: "อา", value: 90 },
];

const topCases = [
  {
    id: "T2507110001234",
    title: "คดีฟิชชิงธนาคาร",
    victims: 123,
    damage: "3,000,000",
    date: "11/02/68",
    summary: "ผู้เสียหายได้รับ SMS ปลอมแอบอ้างธนาคาร...",
    rating: 5,
  },
  {
    id: "T2507110001235",
    title: "คดีหลอกโอนเงิน",
    victims: 97,
    damage: "1,500,000",
    date: "15/02/68",
    summary: "มิจฉาชีพโทรหลอกให้โอนเงินผ่านแอป...",
    rating: 4,
  },
  {
    id: "T2507110001236",
    title: "คดีแฮกข้อมูลบัตรเครดิต",
    victims: 20,
    damage: "800,000",
    date: "20/02/68",
    summary: "ข้อมูลบัตรรั่วจากการชำระเงินผ่านเว็บไซต์ปลอม...",
    rating: 3,
  },
  {
    id: "T2507110001237",
    title: "คดีปลอมเพจราชการ",
    victims: 55,
    damage: "2,000,000",
    date: "22/02/68",
    summary: "มีการสร้างเพจปลอมแอบอ้างราชการเพื่อหลอกลวง...",
    rating: 4,
  },
  {
    id: "T2507110001238",
    title: "คดีส่งลิงก์หลอกขโมยรหัส",
    victims: 30,
    damage: "1,000,000",
    date: "01/03/68",
    summary: "ผู้เสียหายคลิกลิงก์ปลอม ทำให้รหัสผ่านหลุด...",
    rating: 5,
  },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen space-y-10 pb-10">
      <div className="max-w-7xl mx-auto p-4 space-y-6 bg-[#ECEBF2] rounded-xl">
        <h1 className="text-3xl font-bold text-blue-900">Dashboard</h1>

        <div className="grid grid-cols-4 gap-4">
          {summaryStats.map((stat, i) => (
            <Card
              key={i}
              className={`p-4 ${
                i === 0
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
                  <Pie data={caseTypes} dataKey="value" nameKey="name" outerRadius={120}>
                    {caseTypes.map((entry, index) => (
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
                <BarChart data={monthlyData}>
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
              <BarChart data={weeklyData}>
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
                {topCases.map((caseItem) => (
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
