"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, File, Star, StarHalf, StarOff, Pencil } from "lucide-react";
import { mockCases, Case } from "@/app/mockCases";

interface EvidenceFile {
  id: string;
  original_filename: string;
  upload_timestamp: string;
}

export default function CaseDetailPage() {
  const pathname = usePathname();
  const caseNumber = pathname.split("/").pop();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!caseNumber) return;

    try {
      const foundCase = mockCases.find((c) => c.case_number === caseNumber);
      if (!foundCase) throw new Error("ไม่พบข้อมูลคดี");
      setCaseData(foundCase);

      setEvidenceFiles([
        {
          id: "1",
          original_filename: "screenshot1.jpg",
          upload_timestamp: new Date(2025, 6, 1).toISOString(),
        },
        {
          id: "2",
          original_filename: "document.pdf",
          upload_timestamp: new Date(2025, 5, 28).toISOString(),
        },
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [caseNumber]);

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
      <div className="flex justify-between items-center">
  <h1 className="text-4xl font-bold text-blue-900">รายละเอียดคดี</h1>
  <Link href={`/cases/${caseData.case_number}/edit`} title="แก้ไขคดี">
    <div className="w-10 h-10 flex items-center justify-center rounded-full border bg-white hover:bg-gray-100 shadow cursor-pointer">
      <Pencil className="w-5 h-5 text-gray-700" />
    </div>
  </Link>
</div>


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
            <p className="text-3xl font-bold">{caseData.num_victims ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm">มูลค่าความเสียหาย</p>
            <p className="text-3xl font-bold text-blue-900">
              {caseData.estimated_financial_damage.toLocaleString()} บาท
            </p>
          </CardContent>
        </Card>
        <Card className="bg-red-500 text-white">
          <CardContent className="p-4">
            <p className="text-sm">ระดับความรุนแรง</p>
            {renderStars(caseData.priority_score)}
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
      </div>

      {/* รายละเอียดคดี + ปุ่มดินสอ (มุมขวาบน) */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle>รายละเอียดเหตุการณ์</CardTitle>
         
        </CardHeader>
        <CardContent className="text-sm text-gray-800 leading-relaxed">
          {caseData.description || "ไม่มีรายละเอียดเพิ่มเติม"}
        </CardContent>
      </Card>

      {/* ผู้ร้องทุกข์ และเจ้าหน้าที่ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-yellow-300">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm">ผู้ร้องทุกข์</p>
              <p className="font-semibold">ไม่ระบุ</p>
            </div>
            <ArrowRight className="text-black" />
          </CardContent>
        </Card>
        <Card className="bg-blue-900 text-white">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm">เจ้าหน้าที่ผู้รับผิดชอบ</p>
              <p className="font-semibold">ไม่ระบุ</p>
            </div>
            <ArrowRight />
          </CardContent>
        </Card>
      </div>

      {/* หลักฐาน */}
      <div>
        <h2 className="text-2xl font-bold mt-6 mb-2">หลักฐาน</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evidenceFiles.length ? (
            evidenceFiles.map((file) => {
              const isImage = /\.(jpg|jpeg|png)$/i.test(file.original_filename);
              return (
                <Card key={file.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    {isImage ? (
                      <img
                        src={`/uploads/${file.original_filename}`}
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
                    href={`/uploads/${file.original_filename}`}
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
