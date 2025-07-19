"use client";

import { useState } from "react";
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
import { useRouter } from 'next/navigation';

// Define types for our form data to ensure type safety
interface CaseDetails {
  case_number: string;
  case_name: string;
  case_type: string;
  status: string;
  description: string;
  estimated_financial_damage: number;
  num_victims: number;
  reputational_damage_level: string;
  sensitive_data_compromised: boolean;
  ongoing_threat: boolean;
  risk_of_evidence_loss: boolean;
  technical_complexity_level: string;
  initial_evidence_clarity: string;
}

interface Complainant {
  first_name: string;
  last_name: string;
  phone_number: string;
  address: string;
  district: string;
  subdistrict: string;
  province: string;
  zipcode: string; // Add zipcode
}

interface Officer {
  id: string; // Assuming officer ID might be known
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
}

const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

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

  // 1. --- State Management: สร้าง state เพื่อเก็บข้อมูลจากฟอร์มทั้งหมด ---
  const [caseDetails, setCaseDetails] = useState<Partial<CaseDetails>>({});
  const [complainant, setComplainant] = useState<Partial<Complainant>>({});
  const initialOfficerState: Partial<Officer> = {
    id: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    email: "",
  };

  const [officers, setOfficers] = useState<Partial<Officer>[]>([initialOfficerState]); // Corrected Type and Value
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2. --- Event Handlers: สร้างฟังก์ชันเพื่อรับการเปลี่ยนแปลงข้อมูล ---
  const handleCaseDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // const handleSelectChange = (field: string, value: string) => {
  //   setFormData((prev) => ({ ...prev, [field]: value }));
  // };

  const handleOfficerChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    const key = id.replace('officer-', ''); // 'officer-first-name' -> 'first-name'
    const newOfficers = [...officers];
    newOfficers[index] = { ...newOfficers[index], [key]: value };
    setOfficers(newOfficers);
  };

  const handleSelectChange = (field: keyof CaseDetails, value: string) => {
    setCaseDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleBooleanChange = (field: keyof CaseDetails, value: string) => {
    setCaseDetails(prev => ({ ...prev, [field]: value === 'true' }));
  };

  // 3. --- Submit Handler: สร้างฟังก์ชันสำหรับส่งข้อมูลไปที่ Backend เมื่อกดปุ่ม ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Construct the payload in the format the backend expects
    const payload = {
      case_details: {
        ...caseDetails,
        // Convert string numbers to actual numbers
        estimated_financial_damage: Number(caseDetails.estimated_financial_damage || 0),
        num_victims: Number(caseDetails.num_victims || 0),
      },
      complainant: complainant,
      officers: officers.filter(o => o?.first_name), // Filter out empty officer objects
    };

    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001'}/rank_case`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Something went wrong');
      }

      alert(`Case created successfully! Case ID: ${result.case_id}`);
      router.push('/cases'); // Redirect to cases list page after success

    } catch (err: any) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <h1 className="text-2xl font-bold text-blue-900">บันทึกคดีใหม่</h1>

      {/* Section 1: ข้อมูลเบื้องต้นของคดี */}
      <Card className="bg-[#ECEBF2]">
        <CardHeader>
          <CardTitle className="text-blue-900">1. ข้อมูลเบื้องต้นของคดี</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 ">
          <div className="flex flex-col gap-2">
            <Label htmlFor="case-number">หมายเลขรับแจ้งคดี</Label>
            <Input className="bg-white" id="case-number" placeholder="กรอกหมายเลขรับแจ้งคดี" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="case-title">ชื่อหัวคดี</Label>
            <Input className="bg-white" id="case-title" placeholder="กรอกชื่อหัวคดี" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="case-type">ประเภทของคดี</Label>
              <Select >
                <SelectTrigger className="bg-white" id="case-type">
                  <SelectValue placeholder="เลือกประเภทของคดี" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hacking">Hacking</SelectItem>
                  <SelectItem value="Scam">Scam</SelectItem>
                  <SelectItem value="Illegal Content">Illegal Content</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="case-status">สถานะของคดี</Label>
              <Select>
                <SelectTrigger className="bg-white" id="case-status">
                  <SelectValue placeholder="เลือกสถานะของคดี" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="รอดำเนินการ">รอดำเนินการ</SelectItem>
                  <SelectItem value="กำลังดำเนินการ">กำลังดำเนินการ</SelectItem>
                  <SelectItem value="เสร็จสิ้น">เสร็จสิ้น</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">รายละเอียดเหตุการณ์</Label>
            <Textarea className="bg-white" id="description" placeholder="กรอกรายละเอียดเหตุการณ์" rows={5} />
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
              <Label htmlFor="first-name">ชื่อ-นามสกุล</Label>
              <Input className="bg-white" id="first-name" placeholder="ชื่อ" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="last-name"><br /></Label>
              <Input className="bg-white" id="last-name" placeholder="นามสกุล" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
            <Input className="bg-white" id="phone" placeholder="เบอร์โทรศัพท์" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="address">ที่อยู่</Label>
            <Input className="bg-white" id="address" placeholder="ที่อยู่ (บ้านเลขที่/ซอย/ถนน)" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="district">เขต/อำเภอ</Label>
              <Input className="bg-white" id="district" placeholder="เขต/อำเภอ" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="subdistrict">แขวง/ตำบล</Label>
              <Input className="bg-white" id="subdistrict" placeholder="แขวง/ตำบล" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="province">จังหวัด</Label>
              <Input className="bg-white" id="province" placeholder="จังหวัด" />
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
              <Input className="bg-white" id="victims" placeholder="จำนวนผู้เสียหาย" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="damage">มูลค่าความเสียหายโดยประมาณ (บาท)</Label>
              <Input className="bg-white" id="damage" placeholder="บาท" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reputation">ระดับความเสียหายต่อชื่อเสียง</Label>
            <Select>
              <SelectTrigger className="bg-white" id="reputation">
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
            <Label className="font-bold">การประเมินความเสี่ยง</Label>
            <div className="space-y-1">
              <label className="flex items-center gap-2">
                <Input type="radio" name="risk" className="h-4 w-4" />
                ข้อมูลสำคัญอาจจะเปิด
              </label>
              <label className="flex items-center gap-2">
                <Input type="radio" name="risk" className="h-4 w-4" />
                มีบุคคลที่เกี่ยวข้องกำลังเปิดอยู่
              </label>
              <label className="flex items-center gap-2">
                <Input type="radio" name="risk" className="h-4 w-4" />
                ความเสี่ยงต่อการสูญหายของพยานหลักฐาน
              </label>
            </div>
          </div>


          <div className="flex flex-col gap-2">
            <Label htmlFor="complexity">ระดับความซับซ้อนทางเทคนิค</Label>
            <Select>
              <SelectTrigger className="bg-white" id="complexity">
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
            <Label htmlFor="evidence">ความชัดเจนของพยานหลักฐานเบื้องต้น</Label>
            <Input className="bg-white" id="evidence" placeholder="กรอกข้อมูล" />
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
              <Input className="bg-white" id="officer-first-name" placeholder="ชื่อ" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="officer-last-name">นามสกุล</Label>
              <Input className="bg-white" id="officer-last-name" placeholder="นามสกุล" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="officer-id">หมายเลขประจำตัวเจ้าหน้าที่</Label>
            <Input className="bg-white" id="officer-id" placeholder="เลขประจำตัว" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="officer-phone">เบอร์โทรศัพท์</Label>
              <Input className="bg-white" id="officer-phone" placeholder="เบอร์โทรศัพท์" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="officer-email">อีเมล</Label>
              <Input className="bg-white" id="officer-email" placeholder="อีเมล" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button className="bg-blue-700 text-white hover:bg-blue-800">
          บันทึกคดี
        </Button>
      </div>
    </div>
  );
}
