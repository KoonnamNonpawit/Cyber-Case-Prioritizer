"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation"; // ใช้แทน useParams
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, File, Star, StarHalf, StarOff } from "lucide-react";

interface CaseDetail {
  id: string;
  case_number: string;
  case_name: string;
  case_type: string;
  status: string;
  description: string;
  num_victims: number;
  estimated_financial_damage: number;
  priority_score: number;
  timestamp: string;
  date_closed: string | null;
  complainant?: {
    first_name: string;
    last_name: string;
  };
  officers?: {
    first_name: string;
    last_name: string;
  }[];
}

interface EvidenceFile {
  id: string;
  original_filename: string;
  upload_timestamp: string;
}

export default function CaseDetailPage() {
  const pathname = usePathname();
  const caseId = pathname.split("/").pop(); // ดึง caseId จาก URL

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001";

  useEffect(() => {
    if (!caseId) return;

    const fetchData = async () => {
      try {
        const res = await fetch(`${apiBase}/cases/${caseId}`);
        if (!res.ok) throw new Error("ไม่พบข้อมูลคดี");
        const caseJson = await res.json();
        setCaseData(caseJson);

        const filesRes = await fetch(`${apiBase}/cases/${caseId}/files`);
        if (filesRes.ok) {
          const filesJson = await filesRes.json();
          setEvidenceFiles(filesJson);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [caseId, apiBase]);

  const renderStars = (priorityScore: number) => {
    const starScore = Math.min(5, (priorityScore / 100) * 5);
    const fullStars = Math.floor(starScore);
    const hasHalf = starScore - fullStars >= 0.25 && starScore - fullStars < 0.75;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    return (
      <div className="flex items-center gap-1">
        <p className="text-lg font-semibold">{starScore.toFixed(1)} / 5</p>
        <div className="flex text-yellow-500">
          {[...Array(fullStars)].map((_, i) => (
            <Star key={`full-${i}`} className="w-4 h-4 fill-yellow-500" />
          ))}
          {hasHalf && <StarHalf className="w-4 h-4 fill-yellow-500" />}
          {[...Array(emptyStars)].map((_, i) => (
            <StarOff key={`empty-${i}`} className="w-4 h-4 text-gray-400" />
          ))}
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-10 text-center">กำลังโหลดข้อมูล...</div>;
  if (error) return <div className="p-10 text-center text-red-500">{error}</div>;
  if (!caseData) return <div className="p-10 text-center text-gray-500">ไม่พบข้อมูลคดี</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-sm text-blue-900 font-medium uppercase">
        กองบัญชาการตำรวจสืบสวนสอบสวนอาชญากรรมทางเทคโนโลยี
      </div>
      <h1 className="text-4xl font-bold text-blue-900">รายละเอียดคดี</h1>

      {/* ข้อมูลเบื้องต้น */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Card className="bg-blue-800 text-white">
          <CardContent className="p-4">
            <p className="text-sm">หมายเลขรับแจ้งคดี</p>
            <p className="text-xl font-bold">{caseData.case_number}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-700 text-white">
          <CardContent className="p-4">
            <p className="text-sm">ประเภทคดี</p>
            <p className="text-xl font-bold">{caseData.case_type}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-600 text-white">
          <CardContent className="p-4">
            <p className="text-sm">สถานะ</p>
            <p className="text-xl font-bold">{caseData.status}</p>
          </CardContent>
        </Card>
      </div>

      {/* สถิติ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm">จำนวนผู้เสียหาย</p>
            <p className="text-3xl font-bold">{caseData.num_victims || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm">มูลค่าความเสียหาย</p>
            <p className="text-3xl font-bold text-blue-900">
              {caseData.estimated_financial_damage?.toLocaleString() || 0} บาท
            </p>
          </CardContent>
        </Card>
        <Card className="bg-red-500 text-white">
          <CardContent className="p-4">
            <p className="text-sm">ระดับความรุนแรง</p>
            {renderStars(caseData.priority_score || 0)}
          </CardContent>
        </Card>
      </div>

      {/* วันที่ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm">วันที่แจ้งเหตุ</p>
            <p className="text-xl font-bold text-blue-900">
              {new Date(caseData.timestamp).toLocaleDateString("th-TH")}
            </p>
          </CardContent>
        </Card>
        {caseData.date_closed && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm">วันปิดคดี</p>
              <p className="text-xl font-bold text-blue-900">
                {new Date(caseData.date_closed).toLocaleDateString("th-TH")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* รายละเอียดเหตุการณ์ */}
      <Card>
        <CardHeader>
          <CardTitle>รายละเอียดเหตุการณ์</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-800 leading-relaxed">
          {caseData.description || "ไม่มีรายละเอียดเพิ่มเติม"}
        </CardContent>
      </Card>

      {/* ผู้ร้องทุกข์และเจ้าหน้าที่ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-yellow-300">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm">ผู้ร้องทุกข์</p>
              <p className="font-semibold">
                {caseData.complainant
                  ? `${caseData.complainant.first_name} ${caseData.complainant.last_name}`
                  : "ไม่ระบุ"}
              </p>
            </div>
            <ArrowRight className="text-black" />
          </CardContent>
        </Card>
        <Card className="bg-blue-900 text-white">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm">เจ้าหน้าที่ผู้รับผิดชอบ</p>
              <p className="font-semibold">
                {caseData.officers?.length
                  ? caseData.officers.map((o) => `${o.first_name} ${o.last_name}`).join(", ")
                  : "ไม่ระบุ"}
              </p>
            </div>
            <ArrowRight />
          </CardContent>
        </Card>
      </div>

      {/* ไฟล์หลักฐาน */}
      <div>
  <h2 className="text-2xl font-bold mt-6 mb-2">หลักฐาน</h2>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {evidenceFiles.length ? (
      evidenceFiles.map((file) => {
        const isImage = /\.(jpg|jpeg|png)$/i.test(file.original_filename);
        const fileUrl = `${apiBase}/uploads/${file.original_filename}`;

        return (
          <Card key={file.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              {isImage ? (
                <img
                  src={fileUrl}
                  alt={file.original_filename}
                  className="w-16 h-16 object-cover rounded-xl border"
                />
              ) : (
                <div className="w-16 h-16 flex items-center justify-center bg-gray-200 rounded-xl">
                  <File className="w-8 h-8 text-gray-600" />
                </div>
              )}
              <div>
                <p className="font-semibold">{file.original_filename}</p>
                <p className="text-xs text-gray-500">
                  {new Date(file.upload_timestamp).toLocaleDateString("th-TH")}
                </p>
              </div>
            </div>
            <a
              href={fileUrl}
              download
              className="text-blue-600 text-sm hover:underline"
            >
              ดาวน์โหลด
            </a>
          </Card>
        );
      })
    ) : (
      <p className="text-gray-500">ไม่มีไฟล์หลักฐาน</p>
    )}
  </div>
</div>


      <p className="text-xs text-right text-gray-500 mt-2">
        ข้อมูลล่าสุดเมื่อ {new Date().toLocaleDateString("th-TH")}
      </p>
    </div>
  );
}
