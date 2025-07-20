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
  account_number: string;
  groupId?: string;
}

// Group IDs
const groupIds = [undefined, "G020250119", "G020250120", "G020250121"];

// ฟังก์ชันสุ่มเลขบัญชี (บางอันซ้ำบ่อย)
const frequentAccounts = [
  "123-4-56789-0",
  "222-5-55555-1",
  "333-6-44444-2",
  "444-7-12345-3",
  "555-8-88888-4",
];
function randomAccountNumber(): string {
  // 30% โอกาสใช้บัญชีที่ซ้ำ เพื่อให้เจอ top 5
  if (Math.random() < 0.3) {
    return frequentAccounts[Math.floor(Math.random() * frequentAccounts.length)];
  }
  const part1 = Math.floor(100 + Math.random() * 900);
  const part2 = Math.floor(10 + Math.random() * 90);
  const part3 = Math.floor(10000 + Math.random() * 90000);
  const part4 = Math.floor(Math.random() * 10);
  return `${part1}-${part2}-${part3}-${part4}`;
}

// สร้าง mock 200 คดี
export const mockCases: Case[] = Array.from({ length: 200 }, (_, i) => ({
  id: `${i + 1}`,
  case_number: `T2507${String(11000 + i).padStart(5, "0")}`,
  case_name: `คดีทดสอบ ${i + 1}`,
  num_victims: Math.floor(Math.random() * 500), // ผู้เสียหายสุ่ม
  estimated_financial_damage: Math.floor(Math.random() * 10000000) + 50000,
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
  account_number: randomAccountNumber(),
  groupId: groupIds[Math.floor(Math.random() * groupIds.length)],
}));
