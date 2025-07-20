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
          original_filename: "record123gehlrhgleglg.png",
          upload_timestamp: new Date(2025, 6, 18).toISOString(),
        },
        {
          id: "2",
          original_filename: "record123gehlrhgleglg.pdf",
          upload_timestamp: new Date(2025, 6, 18).toISOString(),
        },
        {
          id: "3",
          original_filename: "record123gehlrhgleglg.png",
          upload_timestamp: new Date(2025, 6, 18).toISOString(),
        },
        {
          id: "4",
          original_filename: "record123gehlrhgleglg.pdf",
          upload_timestamp: new Date(2025, 6, 18).toISOString(),
        },
        {
          id: "5",
          original_filename: "record123gehlrhgleglg.png",
          upload_timestamp: new Date(2025, 6, 18).toISOString(),
        },
        {
          id: "6",
          original_filename: "record123gehlrhgleglg.pdf",
          upload_timestamp: new Date(2025, 6, 18).toISOString(),
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
        <p className="text-lg font-semibold text-white">{starScore.toFixed(1)}</p>
        <div className="flex text-white">
          {[...Array(fullStars)].map((_, i) => (
            <Star key={`full-${i}`} className="w-4 h-4 fill-white" />
          ))}
          {hasHalf && <StarHalf className="w-4 h-4 fill-white" />} 
          {[...Array(emptyStars)].map((_, i) => (
            <StarOff key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
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
        <h1 className="text-4xl font-bold text-gray-900">Name case</h1>
      </div>

      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-900 text-white">
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

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm">หมายเลขบัญชีที่เกี่ยวข้อง</p>
            <p className="text-2xl font-bold">{caseData.account_number || "ไม่ระบุ"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm">จำนวนผู้เสียหาย</p>
            <p className="text-2xl font-bold">{caseData.num_victims ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm">มูลค่าความเสียหาย</p>
            <p className="text-2xl font-bold text-blue-900">{caseData.estimated_financial_damage.toLocaleString()} บาท</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-red-600 text-white">
        <CardContent className="p-4">
          <p className="text-sm">ระดับความรุนแรง</p>
          {renderStars(caseData.priority_score)}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm">วันที่เกิดเหตุ</p>
            <p className="text-xl font-bold">{new Date(caseData.timestamp).toLocaleDateString("th-TH")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm">รหัสคดี</p>
            <p className="text-xl font-bold">{caseData.groupId || "วง/ดค/ปปปม"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>รายละเอียดเหตุการณ์</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-700 text-sm leading-relaxed">
          {caseData.description || "ไม่มีรายละเอียดเพิ่มเติม"}
        </CardContent>
      </Card>

      {/* Complainant & Officer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-yellow-400">
          <CardContent className="p-4 flex justify-between">
            <p>ผู้ร้องทุกข์</p>
            <ArrowRight className="text-black" />
          </CardContent>
        </Card>
        <Card className="bg-red-500 text-white">
          <CardContent className="p-4 flex justify-between">
            <p>ผู้ต้องสงสัย</p>
            <ArrowRight />
          </CardContent>
        </Card>
        <Card className="bg-blue-800 text-white">
          <CardContent className="p-4 flex justify-between">
            <p>เจ้าหน้าที่ผู้รับผิดชอบ</p>
            <ArrowRight />
          </CardContent>
        </Card>
      </div>

      {/* Evidence Files */}
      <div>
        <h2 className="text-2xl font-bold mt-6 mb-2">หลักฐาน</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evidenceFiles.map((file) => {
            const isImage = /\.(jpg|jpeg|png)$/i.test(file.original_filename);
            return (
              <Card key={file.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  {isImage ? (
                    <div className="w-16 h-16 bg-black rounded-xl"></div>
                  ) : (
                    <div className="w-16 h-16 bg-black rounded-xl"></div>
                  )}
                  <div>
                    <p className="text-white font-semibold">{file.original_filename}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-right text-gray-500 mt-2">ข้อมูลล่าสุดเมื่อ {new Date().toLocaleDateString("th-TH")}</p>
    </div>
  );
}
