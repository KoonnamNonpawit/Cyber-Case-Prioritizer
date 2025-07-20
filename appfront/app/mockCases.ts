// app/mockCases.ts
export interface Case {
  id: string;  // ใช้เป็นหมายเลขคดีโดยตรง
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

// Group IDs สำหรับบางคดี
const groupIds = [undefined, "G020250119", "G020250120", "G020250121"];

// สถานะคดีและประเภทคดี
const statuses = ["รับเรื่อง", "กำลังสืบสวน", "ปิดคดี"];
const caseTypes = ["Hacking", "Scam", "Phishing", "Illegal Content", "Other"];

// Top 5 บัญชีที่เจอบ่อย (ใช้สำหรับ Dashboard)
const topAccounts = [
  { acc: "123-4-56789-0", count: 40 },
  { acc: "222-5-55555-1", count: 30 },
  { acc: "333-6-44444-2", count: 20 },
  { acc: "444-7-12345-3", count: 10 },
  { acc: "555-8-88888-4", count: 5 },
];

// เตรียม list บัญชีสำหรับ Top 5 ตาม count
const weightedAccounts: string[] = [];
topAccounts.forEach(({ acc, count }) => {
  for (let i = 0; i < count; i++) {
    weightedAccounts.push(acc);
  }
});

// ฟังก์ชันสร้างเลขบัญชี
function generateAccount(index: number): string {
  if (index < weightedAccounts.length) {
    return weightedAccounts[index];
  }
  const p1 = String(600 + (index * 7) % 300);
  const p2 = String(10 + (index * 5) % 90);
  const p3 = String(10000 + (index * 13) % 90000);
  const p4 = String(index % 10);
  return `${p1}-${p2}-${p3}-${p4}`;
}

// Helper เลือกค่าจาก array แบบวน
function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

// สร้าง mock dataset 200 เคส
export const mockCases: Case[] = Array.from({ length: 200 }, (_, i) => {
  const baseDate = new Date(2025, i % 12, (i * 3) % 28 + 1);
  const caseNum = `T2507${String(11000 + i).padStart(5, "0")}`; // หมายเลขคดี

  return {
    id: caseNum,  // ใช้หมายเลขคดีเป็น id
    case_number: caseNum,
    case_name: `คดีประเภท ${pick(caseTypes, i)} ลำดับ ${i + 1}`,
    num_victims: (i * 17) % 500 + 5,
    estimated_financial_damage: ((i * 3571) % 9500000) + 50000,
    timestamp: baseDate.toISOString(),
    description: `รายละเอียดคดีประเภท ${pick(caseTypes, i)} (ID: ${i + 1}) สำหรับการทดสอบ`,
    priority_score: (i * 13) % 100 + 8,
    status: pick(statuses, i),
    case_type: pick(caseTypes, i * 2),
    account_number: generateAccount(i),
    groupId: pick(groupIds, i),
  };
});
