"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Upload } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { mockCases, Case } from "@/app/mockCases";

export default function EditCasePage() {
  const pathname = usePathname();
  const router = useRouter();

  // ดึง case_number (ตัวที่อยู่ก่อน edit)
  const segments = pathname.split("/");
  const caseNumber = segments[segments.length - 2];

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  // ฟอร์ม state
  const [formData, setFormData] = useState({
    caseNumber: "",
    caseTitle: "",
    caseType: "",
    caseStatus: "",
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
    evidenceClarity: "",
    officerFirst: "",
    officerLast: "",
    officerId: "",
    officerPhone: "",
    officerEmail: "",
    risks: [] as string[],
    suspectFirstName: "",
    suspectLastName: "",
    suspectNationalId: "",
    suspectBankAccount: "",
    suspectPhone: "",
    suspectEmail: "",
    suspectAddress: "",
    suspectDistrict: "",
    suspectSubdistrict: "",
    suspectProvince: "",
  });

  // โหลดข้อมูลคดีจาก mockCases
  useEffect(() => {
    const found = mockCases.find((c) => c.case_number === caseNumber);
    if (found) {
      setCaseData(found);
      setFormData((prev) => ({
        ...prev,
        caseNumber: found.case_number,
        caseTitle: found.case_name,
        caseType: found.case_type,
        caseStatus: found.status,
        description: found.description,
        victims: String(found.num_victims),
        damage: String(found.estimated_financial_damage),
      }));
    }
  }, [caseNumber]);

  const mapLevel = (level: string) => {
    if (level === "ต่ำ") return "low";
    if (level === "กลาง") return "medium";
    if (level === "สูง") return "high";
    return "unknown";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRiskChange = (risk: string) => {
    setFormData((prev) => {
      const updated = prev.risks.includes(risk)
        ? prev.risks.filter((r) => r !== risk)
        : [...prev.risks, risk];
      return { ...prev, risks: updated };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const validateForm = () => {
    const requiredFields = [
      "caseNumber",
      "caseTitle",
      "caseType",
      "description",
    ];
    return requiredFields.every((field) => formData[field as keyof typeof formData]);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setSubmitStatus("error");
      setShowPopup(true);
      return;
    }

    setIsLoading(true);
    setSubmitStatus(null);

    try {
      // (ในอนาคตจะเชื่อม backend)
      await new Promise((r) => setTimeout(r, 1000)); // mock API
      setSubmitStatus("success");
      setShowPopup(true);
      setTimeout(() => router.push(`/cases/${caseNumber}`), 1500);
    } catch {
      setSubmitStatus("error");
      setShowPopup(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (!caseData) {
    return <div className="p-10 text-center text-red-500">ไม่พบข้อมูลคดี</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <h1 className="text-2xl font-bold text-blue-900">แก้ไขคดี: {caseData.case_number}</h1>

      {/* Section 1: ข้อมูลคดี */}
      <Card className="bg-[#ECEBF2]">
        <CardHeader>
          <CardTitle className="text-blue-900">1. ข้อมูลเบื้องต้นของคดี</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="caseNumber">หมายเลขรับแจ้งคดี</Label>
            <Input id="caseNumber" value={formData.caseNumber} onChange={handleChange} className="bg-white" />
          </div>
          <div>
            <Label htmlFor="caseTitle">ชื่อหัวคดี</Label>
            <Input id="caseTitle" value={formData.caseTitle} onChange={handleChange} className="bg-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="caseType">ประเภทคดี</Label>
              <Select value={formData.caseType} onValueChange={(v) => handleSelectChange("caseType", v)}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="เลือกประเภทคดี" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hacking">Hacking</SelectItem>
                  <SelectItem value="Scam">Scam</SelectItem>
                  <SelectItem value="Phishing">Phishing</SelectItem>
                  <SelectItem value="Illegal Content">Illegal Content</SelectItem>
                  <SelectItem value="Cyberbullying">Cyberbullying</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>สถานะคดี</Label>
              <Input value={formData.caseStatus} disabled className="bg-gray-100" />
            </div>
          </div>
          <div>
            <Label htmlFor="description">รายละเอียดเหตุการณ์</Label>
            <Textarea id="description" value={formData.description} onChange={handleChange} rows={5} className="bg-white" />
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
            <div>
              <Label htmlFor="firstName">ชื่อ</Label>
              <Input id="firstName" value={formData.firstName} onChange={handleChange} className="bg-white" />
            </div>
            <div>
              <Label htmlFor="lastName">นามสกุล</Label>
              <Input id="lastName" value={formData.lastName} onChange={handleChange} className="bg-white" />
            </div>
          </div>
          <div>
            <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
            <Input id="phone" value={formData.phone} onChange={handleChange} className="bg-white" />
          </div>
          <div>
            <Label htmlFor="address">ที่อยู่</Label>
            <Input id="address" value={formData.address} onChange={handleChange} className="bg-white" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="district">เขต/อำเภอ</Label>
              <Input id="district" value={formData.district} onChange={handleChange} className="bg-white" />
            </div>
            <div>
              <Label htmlFor="subdistrict">แขวง/ตำบล</Label>
              <Input id="subdistrict" value={formData.subdistrict} onChange={handleChange} className="bg-white" />
            </div>
            <div>
              <Label htmlFor="province">จังหวัด</Label>
              <Input id="province" value={formData.province} onChange={handleChange} className="bg-white" />
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
            <div>
              <Label htmlFor="victims">จำนวนผู้เสียหาย</Label>
              <Input id="victims" value={formData.victims} onChange={handleChange} className="bg-white" />
            </div>
            <div>
              <Label htmlFor="damage">มูลค่าความเสียหาย (บาท)</Label>
              <Input id="damage" value={formData.damage} onChange={handleChange} className="bg-white" />
            </div>
          </div>

          <div>
            <Label htmlFor="reputation">ความเสียหายต่อชื่อเสียง</Label>
            <Select value={formData.reputation} onValueChange={(v) => handleSelectChange("reputation", v)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="เลือกระดับ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ต่ำ">ต่ำ</SelectItem>
                <SelectItem value="กลาง">กลาง</SelectItem>
                <SelectItem value="สูง">สูง</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-bold">การประเมินความเสี่ยง (เลือกได้หลายข้อ)</Label>
            <div className="space-y-1">
              <label className="flex items-center gap-2">
                <Input type="checkbox" className="h-4 w-4" onChange={() => handleRiskChange("ข้อมูลสำคัญอาจจะเปิด")} />
                ข้อมูลสำคัญอาจจะเปิด
              </label>
              <label className="flex items-center gap-2">
                <Input type="checkbox" className="h-4 w-4" onChange={() => handleRiskChange("มีบุคคลที่เกี่ยวข้องกำลังเปิดอยู่")} />
                มีบุคคลที่เกี่ยวข้องกำลังเปิดอยู่
              </label>
              <label className="flex items-center gap-2">
                <Input type="checkbox" className="h-4 w-4" onChange={() => handleRiskChange("ความเสี่ยงต่อการสูญหายของพยานหลักฐาน")} />
                ความเสี่ยงต่อการสูญหายของพยานหลักฐาน
              </label>
            </div>
          </div>
          <div>
            <Label htmlFor="complexity">ความซับซ้อนทางเทคนิค</Label>
            <Select value={formData.complexity} onValueChange={(v) => handleSelectChange("complexity", v)}>
              <SelectTrigger className="bg-white">
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
            <Label htmlFor="evidenceClarity">ความชัดเจนของหลักฐาน</Label>
            <Input id="evidenceClarity" value={formData.evidenceClarity} onChange={handleChange} className="bg-white" />
          </div>
        </CardContent>
      </Card>

      {/* Section 4: เจ้าหน้าที่ */}
      <Card className="bg-[#ECEBF2]">
        <CardHeader>
          <CardTitle className="text-blue-900">4. เจ้าหน้าที่</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="officerFirst">ชื่อ</Label>
              <Input id="officerFirst" value={formData.officerFirst} onChange={handleChange} className="bg-white" />
            </div>
            <div>
              <Label htmlFor="officerLast">นามสกุล</Label>
              <Input id="officerLast" value={formData.officerLast} onChange={handleChange} className="bg-white" />
            </div>
          </div>
          <div>
            <Label htmlFor="officerId">หมายเลขประจำตัว</Label>
            <Input id="officerId" value={formData.officerId} onChange={handleChange} className="bg-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="officerPhone">เบอร์โทรศัพท์</Label>
              <Input id="officerPhone" value={formData.officerPhone} onChange={handleChange} className="bg-white" />
            </div>
            <div>
              <Label htmlFor="officerEmail">อีเมล</Label>
              <Input id="officerEmail" value={formData.officerEmail} onChange={handleChange} className="bg-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 5: หลักฐาน + ผู้ต้องสงสัย */}
      <Card className="bg-[#ECEBF2]">
        <CardHeader>
          <CardTitle className="text-blue-900">5. หลักฐานและผู้ต้องสงสัย</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <label
            htmlFor="evidence-upload"
            className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-400 rounded-xl cursor-pointer hover:bg-gray-100"
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
            <ul className="list-disc pl-5 text-gray-600">
              {files.map((f, idx) => (
                <li key={idx}>{f.name}</li>
              ))}
            </ul>
          )}

          <h3 className="text-lg font-bold text-blue-900">ข้อมูลผู้ต้องสงสัย</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="suspectFirstName">ชื่อ</Label>
              <Input id="suspectFirstName" value={formData.suspectFirstName} onChange={handleChange} className="bg-white" />
            </div>
            <div>
              <Label htmlFor="suspectLastName">นามสกุล</Label>
              <Input id="suspectLastName" value={formData.suspectLastName} onChange={handleChange} className="bg-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="suspectNationalId">เลขบัตรประชาชน</Label>
              <Input id="suspectNationalId" value={formData.suspectNationalId} onChange={handleChange} className="bg-white" />
            </div>
            <div>
              <Label htmlFor="suspectBankAccount">เลขบัญชีธนาคาร</Label>
              <Input id="suspectBankAccount" value={formData.suspectBankAccount} onChange={handleChange} className="bg-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="suspectPhone">เบอร์โทรศัพท์</Label>
              <Input id="suspectPhone" value={formData.suspectPhone} onChange={handleChange} className="bg-white" />
            </div>
            <div>
              <Label htmlFor="suspectEmail">อีเมล</Label>
              <Input id="suspectEmail" value={formData.suspectEmail} onChange={handleChange} className="bg-white" />
            </div>
          </div>
          <div>
            <Label htmlFor="suspectAddress">ที่อยู่</Label>
            <Input id="suspectAddress" value={formData.suspectAddress} onChange={handleChange} className="bg-white" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="suspectDistrict">เขต/อำเภอ</Label>
              <Input id="suspectDistrict" value={formData.suspectDistrict} onChange={handleChange} className="bg-white" />
            </div>
            <div>
              <Label htmlFor="suspectSubdistrict">แขวง/ตำบล</Label>
              <Input id="suspectSubdistrict" value={formData.suspectSubdistrict} onChange={handleChange} className="bg-white" />
            </div>
            <div>
              <Label htmlFor="suspectProvince">จังหวัด</Label>
              <Input id="suspectProvince" value={formData.suspectProvince} onChange={handleChange} className="bg-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="text-center">
        <Button onClick={handleSubmit} disabled={isLoading} className="px-6 py-3 text-white bg-blue-700 hover:bg-blue-800">
          {isLoading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
        </Button>
        <Dialog open={showPopup} onOpenChange={setShowPopup}>
          <DialogContent className="max-w-sm text-center">
            <DialogHeader>
              <DialogTitle className={`text-lg font-bold ${submitStatus === "success" ? "text-green-600" : "text-red-600"}`}>
                {submitStatus === "success" ? "แก้ไขสำเร็จ!" : "บันทึกไม่สำเร็จ!"}
              </DialogTitle>
            </DialogHeader>
            <p className="text-gray-700">
              {submitStatus === "success" ? "คดีถูกแก้ไขเรียบร้อยแล้ว" : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"}
            </p>
            <DialogFooter className="flex justify-center mt-4">
              <Button onClick={() => setShowPopup(false)} className="bg-blue-600 text-white hover:bg-blue-700">
                ตกลง
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}