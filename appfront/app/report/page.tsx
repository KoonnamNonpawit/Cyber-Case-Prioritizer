"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function ReportCasePage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  const [formData, setFormData] = useState({
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

  // helper แปลงค่าระดับความเสียหาย/ซับซ้อนให้ ML ใช้ (อังกฤษ)
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
      "firstName",
      "lastName",
      "phone",
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

    const payload = {
      case_details: {
        case_number: formData.caseNumber,
        case_name: formData.caseTitle,
        case_type: formData.caseType.toLowerCase(),
        status: "รอดำเนินการ",
        description: formData.description,
        estimated_financial_damage: Number(formData.damage || 0),
        num_victims: Number(formData.victims || 0),
        reputational_damage_level: mapLevel(formData.reputation),
        sensitive_data_compromised: formData.risks.includes("ข้อมูลสำคัญอาจจะเปิด"),
        ongoing_threat: formData.risks.includes("มีบุคคลที่เกี่ยวข้องกำลังเปิดอยู่"),
        risk_of_evidence_loss: formData.risks.includes("ความเสี่ยงต่อการสูญหายของพยานหลักฐาน"),
        technical_complexity_level: mapLevel(formData.complexity),
        initial_evidence_clarity: formData.evidenceClarity,
      },
      complainant: {
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone_number: formData.phone,
        email: null,
        address: formData.address,
        district: formData.district,
        subdistrict: formData.subdistrict,
        province: formData.province,
        zipcode: "00000",
      },
      officers: [
        {
          id: formData.officerId || undefined,
          first_name: formData.officerFirst,
          last_name: formData.officerLast,
          phone_number: formData.officerPhone,
          email: formData.officerEmail,
        },
      ],
      suspects: [
        {
          first_name: formData.suspectFirstName || "",
          last_name: formData.suspectLastName || "",
          national_id: formData.suspectNationalId || "",
          bank_account: formData.suspectBankAccount || "",
          phone_number: formData.suspectPhone || "",
          email: formData.suspectEmail || "",
          address: formData.suspectAddress || "",
          district: formData.suspectDistrict || "",
          subdistrict: formData.suspectSubdistrict || "",
          province: formData.suspectProvince || "",
        },
      ],
    };
    

    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001"}/rank_case`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("ส่งข้อมูลไม่สำเร็จ");

      setSubmitStatus("success");
      setShowPopup(true);
      setTimeout(() => router.push("/cases"), 1500);
    } catch (error) {
      setSubmitStatus("error");
      setShowPopup(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <h1 className="text-2xl font-bold text-blue-900">บันทึกคดีใหม่</h1>

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
              <Select onValueChange={(v) => handleSelectChange("caseType", v)}>
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
              <Input value="รอดำเนินการ" disabled className="bg-gray-100" />
            </div>
          </div>
          <div>
            <Label htmlFor="description">รายละเอียดเหตุการณ์</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              className="bg-white w-full resize-y break-words whitespace-pre-wrap overflow-x-hidden"
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
              <Label htmlFor="firstName">ชื่อ</Label>
              <Input id="firstName" placeholder="ชื่อ" value={formData.firstName} onChange={handleChange} className="bg-white" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lastName">นามสกุล</Label>
              <Input id="lastName" placeholder="นามสกุล" value={formData.lastName} onChange={handleChange} className="bg-white" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
            <Input id="phone" placeholder="เบอร์โทรศัพท์" value={formData.phone} onChange={handleChange} className="bg-white" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="address">ที่อยู่ (บ้านเลขที่/ซอย/ถนน)</Label>
            <Input id="address" placeholder="บ้านเลขที่/ซอย/ถนน" value={formData.address} onChange={handleChange} className="bg-white" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="district">เขต/อำเภอ</Label>
              <Input id="district" placeholder="เขต/อำเภอ" value={formData.district} onChange={handleChange} className="bg-white" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="subdistrict">แขวง/ตำบล</Label>
              <Input id="subdistrict" placeholder="แขวง/ตำบล" value={formData.subdistrict} onChange={handleChange} className="bg-white" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="province">จังหวัด</Label>
              <Input id="province" placeholder="จังหวัด" value={formData.province} onChange={handleChange} className="bg-white" />
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
              <Input id="victims" placeholder="จำนวนผู้เสียหาย" value={formData.victims} onChange={handleChange} className="bg-white" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="damage">มูลค่าความเสียหายโดยประมาณ (บาท)</Label>
              <Input id="damage" placeholder="บาท" value={formData.damage} onChange={handleChange} className="bg-white" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reputation">ระดับความเสียหายต่อชื่อเสียง</Label>
            <Select onValueChange={(v) => handleSelectChange("reputation", v)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="เลือกระดับความเสียหาย" />
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="complexity">ระดับความซับซ้อนทางเทคนิค</Label>
            <Select onValueChange={(v) => handleSelectChange("complexity", v)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="เลือกระดับความซับซ้อน" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ต่ำ">ต่ำ</SelectItem>
                <SelectItem value="กลาง">กลาง</SelectItem>
                <SelectItem value="สูง">สูง</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="evidenceClarity">ความชัดเจนของพยานหลักฐานเบื้องต้น</Label>
            <Input id="evidenceClarity" placeholder="กรอกข้อมูล" value={formData.evidenceClarity} onChange={handleChange} className="bg-white" />
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
              <Label htmlFor="officerFirst">ชื่อ</Label>
              <Input id="officerFirst" placeholder="ชื่อ" value={formData.officerFirst} onChange={handleChange} className="bg-white" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="officerLast">นามสกุล</Label>
              <Input id="officerLast" placeholder="นามสกุล" value={formData.officerLast} onChange={handleChange} className="bg-white" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="officerId">หมายเลขประจำตัวเจ้าหน้าที่</Label>
            <Input id="officerId" placeholder="หมายเลขประจำตัว" value={formData.officerId} onChange={handleChange} className="bg-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="officerPhone">เบอร์โทรศัพท์</Label>
              <Input id="officerPhone" placeholder="เบอร์โทรศัพท์" value={formData.officerPhone} onChange={handleChange} className="bg-white" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="officerEmail">อีเมล</Label>
              <Input id="officerEmail" placeholder="อีเมล" value={formData.officerEmail} onChange={handleChange} className="bg-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 5: หลักฐาน + ผู้ต้องสงสัย */}
<Card className="bg-[#ECEBF2]">
  <CardHeader>
    <CardTitle className="text-blue-900">5. หลักฐาน</CardTitle>
  </CardHeader>
  <CardContent className="space-y-6">
    {/* Upload Zone */}
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
        {files.map((file, idx) => (
          <li key={idx}>{file.name}</li>
        ))}
      </ul>
    )}

    {/* Suspect Information */}
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-blue-900">ข้อมูลผู้ต้องสงสัย</h3>
      <p className="text-sm text-gray-500">
        **กรอกเฉพาะข้อมูลที่คุณทราบ ไม่จำเป็นต้องกรอกทุกช่อง
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="suspectFirstName">ชื่อ</Label>
          <Input
            id="suspectFirstName"
            placeholder="ชื่อ"
            value={formData.suspectFirstName || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, suspectFirstName: e.target.value }))
            }
            className="bg-white"
          />
        </div>
        <div>
          <Label htmlFor="suspectLastName">นามสกุล</Label>
          <Input
            id="suspectLastName"
            placeholder="นามสกุล"
            value={formData.suspectLastName || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, suspectLastName: e.target.value }))
            }
            className="bg-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="suspectNationalId">เลขบัตรประชาชน</Label>
          <Input
            id="suspectNationalId"
            placeholder="เลขบัตรประชาชน"
            value={formData.suspectNationalId || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, suspectNationalId: e.target.value }))
            }
            className="bg-white"
          />
        </div>
        <div>
          <Label htmlFor="suspectBankAccount">เลขบัญชีธนาคาร</Label>
          <Input
            id="suspectBankAccount"
            placeholder="เลขบัญชีธนาคาร"
            value={formData.suspectBankAccount || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, suspectBankAccount: e.target.value }))
            }
            className="bg-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="suspectPhone">เบอร์โทรศัพท์</Label>
          <Input
            id="suspectPhone"
            placeholder="เบอร์โทรศัพท์"
            value={formData.suspectPhone || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, suspectPhone: e.target.value }))
            }
            className="bg-white"
          />
        </div>
        <div>
          <Label htmlFor="suspectEmail">อีเมล</Label>
          <Input
            id="suspectEmail"
            placeholder="อีเมล"
            value={formData.suspectEmail || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, suspectEmail: e.target.value }))
            }
            className="bg-white"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="suspectAddress">ที่อยู่ (บ้านเลขที่/ซอย/หมู่/ถนน)</Label>
        <Input
          id="suspectAddress"
          placeholder="บ้านเลขที่/ซอย/หมู่/ถนน"
          value={formData.suspectAddress || ""}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, suspectAddress: e.target.value }))
          }
          className="bg-white"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="suspectDistrict">เขต/อำเภอ</Label>
          <Input
            id="suspectDistrict"
            placeholder="เขต/อำเภอ"
            value={formData.suspectDistrict || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, suspectDistrict: e.target.value }))
            }
            className="bg-white"
          />
        </div>
        <div>
          <Label htmlFor="suspectSubdistrict">แขวง/ตำบล</Label>
          <Input
            id="suspectSubdistrict"
            placeholder="แขวง/ตำบล"
            value={formData.suspectSubdistrict || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, suspectSubdistrict: e.target.value }))
            }
            className="bg-white"
          />
        </div>
        <div>
          <Label htmlFor="suspectProvince">จังหวัด</Label>
          <Input
            id="suspectProvince"
            placeholder="จังหวัด"
            value={formData.suspectProvince || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, suspectProvince: e.target.value }))
            }
            className="bg-white"
          />
        </div>
      </div>
    </div>
  </CardContent>
</Card>

      {/* Submit + Popup */}
      <div className="text-center">
        <Button onClick={handleSubmit} disabled={isLoading} className="px-6 py-3 text-white bg-blue-700 hover:bg-blue-800">
          {isLoading ? "กำลังบันทึก..." : "บันทึกคดี"}
        </Button>
        <Dialog open={showPopup} onOpenChange={setShowPopup}>
          <DialogContent className="max-w-sm text-center">
            <DialogHeader>
              <DialogTitle className={`text-lg font-bold ${submitStatus === "success" ? "text-green-600" : "text-red-600"}`}>
                {submitStatus === "success" ? "บันทึกสำเร็จ!" : "บันทึกไม่สำเร็จ!"}
              </DialogTitle>
            </DialogHeader>
            <p className="text-gray-700">
              {submitStatus === "success" ? "คดีถูกบันทึกเรียบร้อยแล้ว" : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"}
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
