// app/mockCases.ts
export interface Case {
    id: string;
    case_number: string;
    case_name: string;
    num_victims: number;
    estimated_financial_damage: number;
    timestamp: string;
    description: string;
    priority_score: number;
    status: string;
    case_type: string;
    groupId?: string;
  }
  
  // สุ่ม groupId 3 กลุ่ม + ไม่มี group
  const groupIds = [undefined, "G020250119", "G020250120", "G020250121"];
  
  export const mockCases: Case[] = Array.from({ length: 30 }, (_, i) => ({
    id: `${i + 1}`,
    case_number: `T250711000${i + 100}`,
    case_name: `คดีทดสอบ ${i + 1}`,
    num_victims: Math.floor(Math.random() * 200),
    estimated_financial_damage: Math.floor(Math.random() * 5000000) + 100000,
    timestamp: new Date(
      2025,
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1
    ).toISOString(),
    description: "รายละเอียดคดี (mock) สำหรับการทดสอบ",
    priority_score: Math.floor(Math.random() * 100),
    status: ["รับเรื่อง", "กำลังสืบสวน", "ปิดคดี"][
      Math.floor(Math.random() * 3)
    ],
    case_type: ["Hacking", "Scam", "Phishing", "Illegal Content", "Other"][
      Math.floor(Math.random() * 5)
    ],
    groupId: groupIds[Math.floor(Math.random() * groupIds.length)],
  }));
  