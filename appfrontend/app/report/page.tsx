"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ReportCasePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    caseNumber: "",
    caseTitle: "",
    caseType: "",
    caseStatus: "รอดำเนินการ", // Default
    description: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    district: "",
    subdistrict: "",
    province: "",
    victims: "",
    damage: "",
    reputation: "",
    complexity: "",
    evidence: "",
    officerFirst: "",
    officerLast: "",
    officerId: "",
    officerPhone: "",
    officerEmail: "",
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  const router = useRouter();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const validateForm = () => {
    const requiredFields = [
      "caseNumber",
      "caseTitle",
      "caseType",
      "description",
      "firstName",
      "lastName",
      "phone",
      "victims",
      "damage",
      "officerFirst",
      "officerLast",
      "officerId",
      "officerPhone",
    ];
    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        return false;
      }
    }
    if (files.length === 0) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setShowError(true);
      setShowSuccess(false);
      return;
    }

    setShowError(false);
    setShowSuccess(true);

    // Mock API call (ยังไม่เชื่อม backend)
    await new Promise((res) => setTimeout(res, 1500));

    // Reset form หลังบันทึก
    setFormData({
      caseNumber: "",
      caseTitle: "",
      caseType: "",
      caseStatus: "รอดำเนินการ",
      description: "",
      firstName: "",
      lastName: "",
      phone: "",
      address: "",
      district: "",
      subdistrict: "",
      province: "",
      victims: "",
      damage: "",
      reputation: "",
      complexity: "",
      evidence: "",
      officerFirst: "",
      officerLast: "",
      officerId: "",
      officerPhone: "",
      officerEmail: "",
    });
    setFiles([]);

    // Redirect ไปหน้ารายการคดีหลัง 3 วิ
    setTimeout(() => {
      router.push("/cases");
    }, 3000);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <h1 className="text-2xl font-bold text-blue-900">บันทึกคดีใหม่</h1>

      {/* Alert */}
      {showSuccess && (
        <div className="flex items-center gap-3 bg-green-100 text-green-700 p-4 rounded-xl">
          <CheckCircle className="w-6 h-6" />
          <span className="font-bold">บันทึกคดีสำเร็จ</span>
        </div>
      )}
      {showError && (
        <div className="flex items-center gap-3 bg-red-100 text-red-700 p-4 rounded-xl">
          <AlertCircle className="w-6 h-6" />
          <span className="font-bold">กรอกข้อมูลให้ครบก่อนบันทึกคดี</span>
        </div>
      )}

      {/* Section 1: ข้อมูลคดี */}
      <Card className="bg-[#ECEBF2]">
        <CardHeader>
          <CardTitle className="text-blue-900">1. ข้อมูลเบื้องต้นของคดี</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="caseNumber">หมายเลขรับแจ้งคดี</Label>
            <Input
              id="caseNumber"
              value={formData.caseNumber}
              onChange={handleChange}
              className="bg-white"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="caseTitle">ชื่อหัวคดี</Label>
            <Input
              id="caseTitle"
              value={formData.caseTitle}
              onChange={handleChange}
              className="bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="caseType">ประเภทของคดี</Label>
              <Select onValueChange={(val) => handleSelectChange("caseType", val)}>
                <SelectTrigger id="caseType" className="bg-white">
                  <SelectValue placeholder="เลือกประเภทของคดี" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Phishing">Phishing</SelectItem>
                  <SelectItem value="Scam">Scam</SelectItem>
                  <SelectItem value="Hacking">Hacking</SelectItem>
                  <SelectItem value="Cyberbullying">Cyberbullying</SelectItem>
                  <SelectItem value="Cyberbullying">Illegal Content</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="caseStatus">สถานะของคดี</Label>
              <Input
                id="caseStatus"
                value="รอดำเนินการ"
                disabled
                className="bg-gray-100"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">รายละเอียดเหตุการณ์</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={handleChange}
              className="bg-white w-full resize-y break-words whitespace-pre-wrap overflow-x-hidden"
              placeholder="กรอกรายละเอียดเหตุการณ์"
              rows={5}
            />
          </div>
        </CardContent>
      </Card>


      {/* Section 2: ข้อมูลผู้ร้องทุกข์ */}
      <Card className="bg-[#ECEBF2]">
        <CardHeader>
          <CardTitle className="text-blue-900">2. ข้อมูลผู้ร้องทุกข์</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="first-name">ชื่อ</Label>
              <Input id="first-name" className="bg-white" placeholder="ชื่อ" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="last-name">นามสกุล</Label>
              <Input id="last-name" className="bg-white" placeholder="นามสกุล" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
            <Input id="phone" className="bg-white" placeholder="เบอร์โทรศัพท์" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="address">ที่อยู่</Label>
            <Input id="address" className="bg-white" placeholder="บ้านเลขที่/ซอย/ถนน" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="district">เขต/อำเภอ</Label>
              <Input id="district" className="bg-white" placeholder="เขต/อำเภอ" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="subdistrict">แขวง/ตำบล</Label>
              <Input id="subdistrict" className="bg-white" placeholder="แขวง/ตำบล" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="province">จังหวัด</Label>
              <Input id="province" className="bg-white" placeholder="จังหวัด" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: การประเมินเบื้องต้น */}
      <Card className="bg-[#ECEBF2]">
        <CardHeader>
          <CardTitle className="text-blue-900">3. การประเมินเบื้องต้น</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="victims">จำนวนผู้เสียหาย</Label>
              <Input id="victims" className="bg-white" placeholder="จำนวนผู้เสียหาย" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="damage">มูลค่าความเสียหาย (บาท)</Label>
              <Input id="damage" className="bg-white" placeholder="บาท" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reputation">ระดับความเสียหายต่อชื่อเสียง</Label>
            <Select>
              <SelectTrigger id="reputation" className="bg-white">
                <SelectValue placeholder="เลือกระดับ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ต่ำ">ต่ำ</SelectItem>
                <SelectItem value="กลาง">กลาง</SelectItem>
                <SelectItem value="สูง">สูง</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="font-bold">การประเมินความเสี่ยง</Label>
            <div className="flex flex-col gap-2 mt-2">
              <label className="flex gap-2 items-center">
                <Input type="checkbox" className="h-4 w-4" /> ข้อมูลสำคัญอาจจะเปิด
              </label>
              <label className="flex gap-2 items-center">
                <Input type="checkbox" className="h-4 w-4" /> บุคคลที่เกี่ยวข้องยังเปิดอยู่
              </label>
              <label className="flex gap-2 items-center">
                <Input type="checkbox" className="h-4 w-4" /> เสี่ยงต่อการสูญหายของพยานหลักฐาน
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="complexity">ความซับซ้อนทางเทคนิค</Label>
            <Select>
              <SelectTrigger id="complexity" className="bg-white">
                <SelectValue placeholder="เลือกระดับ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ต่ำ">ต่ำ</SelectItem>
                <SelectItem value="กลาง">กลาง</SelectItem>
                <SelectItem value="สูง">สูง</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="evidence">ความชัดเจนของพยานหลักฐาน</Label>
            <Input id="evidence" className="bg-white" placeholder="กรอกข้อมูล" />
          </div>
        </CardContent>
      </Card>

      {/* Section 4: เจ้าหน้าที่ผู้รับผิดชอบ */}
      <Card className="bg-[#ECEBF2]">
        <CardHeader>
          <CardTitle className="text-blue-900">4. เจ้าหน้าที่ผู้รับผิดชอบ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="officer-first-name">ชื่อ</Label>
              <Input id="officer-first-name" className="bg-white" placeholder="ชื่อ" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="officer-last-name">นามสกุล</Label>
              <Input id="officer-last-name" className="bg-white" placeholder="นามสกุล" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="officer-id">หมายเลขประจำตัวเจ้าหน้าที่</Label>
            <Input id="officer-id" className="bg-white" placeholder="เลขประจำตัว" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="officer-phone">เบอร์โทรศัพท์</Label>
              <Input id="officer-phone" className="bg-white" placeholder="เบอร์โทรศัพท์" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="officer-email">อีเมล</Label>
              <Input id="officer-email" className="bg-white" placeholder="อีเมล" />
            </div>
          </div>
        </CardContent>
      </Card>

       {/* Section 5: หลักฐาน */}
      <div className="bg-[#ECEBF2] rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-blue-900">5. หลักฐาน</h2>
        <label
          htmlFor="evidence-upload"
          className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-400 rounded-xl cursor-pointer hover:bg-gray-100 transition"
        >
          <Upload className="w-10 h-10 text-blue-600 mb-2" />
          <p className="text-gray-700 font-semibold">อัปโหลดไฟล์หลักฐาน</p>
          <p className="text-gray-500 text-sm">รองรับไฟล์: PDF, JPG, PNG</p>
          <input
            id="evidence-upload"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
        {files.length > 0 && (
          <ul className="list-disc pl-5 text-gray-700">
            {files.map((f, i) => (
              <li key={i}>{f.name}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="text-center">
        <Button
          onClick={handleSubmit}
          className="bg-blue-700 text-white hover:bg-blue-800"
        >
          บันทึกคดี
        </Button>
      </div>
    </div>
  );
}
