import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, File } from "lucide-react";

const mockCases = [
  {
    id: "T2507110001234",
    name: "ชื่อคดีตัวอย่าง",
    type: "หลอกลวงออนไลน์",
    status: "กำลังดำเนินการ",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    victimCount: 123,
    damage: 123000000,
    severity: 4.0,
    reportDate: "11/02/2568",
    occurrenceDate: "วว/ดด/ปปปป",
    reporter: "นายอนาลา นานานาลา",
    officer: "ผบ.ตร.นานาลา นานานาลา",
    evidences: [
      { name: "record123ghelrhgleglg", type: "PNG" },
      { name: "record123ghelrhgleglg", type: "PNG" },
      { name: "record123ghelrhgleglg", type: "PNG" },
      { name: "record123ghelrhgleglg", type: "PDF" },
      { name: "record123ghelrhgleglg", type: "PDF" },
      { name: "record123ghelrhgleglg", type: "PDF" },
    ],
  },
];

function renderStars(score: number) {
  const full = "⭐️".repeat(Math.round(score));
  const empty = "☆".repeat(5 - Math.round(score));
  return full + empty;
}

interface PageProps {
  params: { caseId: string };
}

export default async function CaseDetailPage({ params }: PageProps) {
  const data = mockCases.find((c) => c.id === params.caseId);
  
  if (!data) return notFound();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-sm text-blue-900 font-medium uppercase">
        กองบัญชาการตำรวจสืบสวนสอบสวนอาชญากรรมทางเทคโนโลยี
      </div>
      <h1 className="text-4xl font-bold text-blue-900">Name case</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Card className="bg-blue-800 text-white">
          <CardContent className="p-4">
            <p className="text-sm">หมายเลขรับแจ้งคดี</p>
            <p className="text-xl font-bold">{data.id}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-700 text-white">
          <CardContent className="p-4">
            <p className="text-sm">ประเภทคดี</p>
            <p className="text-xl font-bold">{data.type}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-600 text-white">
          <CardContent className="p-4">
            <p className="text-sm">สถานะ</p>
            <p className="text-xl font-bold">{data.status}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm">จำนวนผู้เสียหาย</p>
            <p className="text-3xl font-bold">{data.victimCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm">มูลค่าความเสียหาย</p>
            <p className="text-3xl font-bold text-blue-900">
              {data.damage.toLocaleString()} บาท
            </p>
          </CardContent>
        </Card>
        <Card className="bg-red-500 text-white">
          <CardContent className="p-4">
            <p className="text-sm">ระดับความรุนแรง</p>
            <p className="text-xl font-bold">{data.severity.toFixed(1)}</p>
            <div>{renderStars(data.severity)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm">วันที่แจ้งเหตุ</p>
            <p className="text-xl font-bold text-blue-900">{data.reportDate}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm">วันเกิดเหตุ</p>
            <p className="text-xl font-bold text-blue-900">
              {data.occurrenceDate}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายละเอียดเหตุการณ์</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-800 leading-relaxed">
          {data.description}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-yellow-300">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm">ผู้ร้องทุกข์</p>
              <p className="font-semibold">{data.reporter}</p>
            </div>
            <ArrowRight className="text-black" />
          </CardContent>
        </Card>
        <Card className="bg-blue-900 text-white">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm">เจ้าหน้าที่ผู้รับผิดชอบ</p>
              <p className="font-semibold">{data.officer}</p>
            </div>
            <ArrowRight />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold mt-6 mb-2">หลักฐาน</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.evidences.map((e, idx) => (
            <Card key={idx} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="bg-black w-12 h-12 rounded-xl" />
                <div>
                  <p className="font-semibold">{e.name}</p>
                  <p className="text-xs text-gray-500">{e.type}</p>
                </div>
              </div>
              <File className="text-gray-400" />
            </Card>
          ))}
        </div>
      </div>

      <p className="text-xs text-right text-gray-500 mt-2">
        ข้อมูลล่าสุดเมื่อ 2 วันที่แล้ว
      </p>
    </div>
  );
}
