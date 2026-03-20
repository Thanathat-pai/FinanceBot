// --- TYPES ---

"use client";

import React, { useState } from "react";

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  icon?: string | null;
  color?: string | null;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  category_id: string;
  category?: Category;
  note?: string | null;
  date: string;
  created_at?: string;
  updated_at?: string;
}

export interface MonthNavigatorHeaderProps {
  currentMonth: string;
  currentYear: number;
  onPrev: () => void;
  onNext: () => void;
}

export interface SummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
}

export interface DonutSegment {
  category: string;
  amount: number;
  color: string;
  icon?: string;
}

export interface ExpenseDonutChartProps {
  segments: DonutSegment[];
  totalExpense: number;
}

export interface BarDataPoint {
  month: string;
  income: number;
  expense: number;
}

export interface MonthlyBarChartProps {
  data: BarDataPoint[];
}

export interface RecentTransactionListProps {
  transactions: Transaction[];
}

export interface BudgetItem {
  category: string;
  icon?: string;
  color: string;
  spent: number;
  limit: number;
}

export interface BudgetProgressListProps {
  budgets: BudgetItem[];
}

export interface TransactionTypeToggleProps {
  value: "income" | "expense";
  onChange: (v: "income" | "expense") => void;
}

export interface QuickAmountKeypadProps {
  amount: string;
  onAmountChange: (v: string) => void;
  selectedCategory: string | null;
  onCategorySelect: (id: string) => void;
  categories: Category[];
}

export interface ShorthandTextInputProps {
  value: string;
  onChange: (v: string) => void;
  onParsed: (note: string, amount: number) => void;
}

export interface DatePickerFieldProps {
  value: string;
  onChange: (v: string) => void;
}

export interface SubmitButtonProps {
  onSubmit: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export interface BottomTabBarProps {
  activeTab: "dashboard" | "add" | "history" | "settings";
  onTabChange: (tab: "dashboard" | "add" | "history" | "settings") => void;
}

export interface FinanceDashboardProps {
  monthLabel: string;
  year: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  donutSegments: DonutSegment[];
  barData: BarDataPoint[];
  recentTransactions: Transaction[];
  budgets: BudgetItem[];
  activeTab: "dashboard" | "add" | "history" | "settings";
  onTabChange: (tab: "dashboard" | "add" | "history" | "settings") => void;
  addFormCategories: Category[];
}

// --- COMPONENT ---

const fmt = (n: number) =>
  new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

// ── MonthNavigatorHeader ──────────────────────────────────────────────────────
const MonthNavigatorHeader: React.FC<MonthNavigatorHeaderProps> = ({
  currentMonth, currentYear, onPrev, onNext,
}) => (
  <div className="flex items-center justify-between px-4 py-3 bg-[#0d0d18] border-b border-[#1e1e30]">
    <button
      onClick={onPrev}
      className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#1e1e30] text-[#00f5ff] hover:bg-[#1e1e30] transition font-mono text-lg"
    >
      ‹
    </button>
    <span className="font-mono text-[#00f5ff] text-base font-bold tracking-widest">
      {currentMonth} {currentYear}
    </span>
    <button
      onClick={onNext}
      className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#1e1e30] text-[#00f5ff] hover:bg-[#1e1e30] transition font-mono text-lg"
    >
      ›
    </button>
  </div>
);

// ── SummaryCards ──────────────────────────────────────────────────────────────
const SummaryCards: React.FC<SummaryCardsProps> = ({ totalIncome, totalExpense, netBalance }) => {
  const cards = [
    { label: "รายรับ", value: totalIncome, bg: "bg-[#0d2218]", border: "border-[#2ecc7133]", text: "text-[#2ecc71]", icon: "↑" },
    { label: "รายจ่าย", value: totalExpense, bg: "bg-[#220d0d]", border: "border-[#e74c3c33]", text: "text-[#e74c3c]", icon: "↓" },
    { label: "คงเหลือ", value: netBalance, bg: "bg-[#0d1422]", border: "border-[#00f5ff33]", text: netBalance >= 0 ? "text-[#00f5ff]" : "text-[#e74c3c]", icon: "=" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 px-3 py-3">
      {cards.map((c) => (
        <div key={c.label} className={`${c.bg} border ${c.border} rounded-xl p-3 flex flex-col gap-1`}>
          <div className="flex items-center gap-1">
            <span className={`font-mono text-xs ${c.text}`}>{c.icon}</span>
            <span className="font-mono text-[10px] text-[#555577]">{c.label}</span>
          </div>
          <span className={`font-mono text-xs font-bold ${c.text} leading-tight break-all`}>
            ฿{fmt(c.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── ExpenseDonutChart (pure SVG, no recharts) ─────────────────────────────────
const ExpenseDonutChart: React.FC<ExpenseDonutChartProps> = ({ segments, totalExpense }) => {
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 58;
  const innerR = 36;

  const total = segments.reduce((s, x) => s + x.amount, 0) || 1;
  let cumAngle = -Math.PI / 2;

  const paths = segments.map((seg) => {
    const angle = (seg.amount / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    const x2 = cx + r * Math.cos(cumAngle + angle);
    const y2 = cy + r * Math.sin(cumAngle + angle);
    const ix1 = cx + innerR * Math.cos(cumAngle);
    const iy1 = cy + innerR * Math.sin(cumAngle);
    const ix2 = cx + innerR * Math.cos(cumAngle + angle);
    const iy2 = cy + innerR * Math.sin(cumAngle + angle);
    const large = angle > Math.PI ? 1 : 0;
    const d = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1}`,
      "Z",
    ].join(" ");
    cumAngle += angle;
    return { d, color: seg.color, category: seg.category, amount: seg.amount };
  });

  if (segments.length === 0) {
    return (
      <div className="bg-[#0d0d18] border border-[#1e1e30] rounded-xl mx-3 p-4 flex flex-col items-center gap-2">
        <span className="font-mono text-[#555577] text-sm">ไม่มีข้อมูลรายจ่าย</span>
      </div>
    );
  }

  return (
    <div className="bg-[#0d0d18] border border-[#1e1e30] rounded-xl mx-3 p-4">
      <span className="font-mono text-[#00f5ff] text-xs font-bold mb-3 block">สัดส่วนรายจ่าย</span>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <svg width={size} height={size}>
            {paths.map((p, i) => (
              <path key={i} d={p.d} fill={p.color} stroke="#080810" strokeWidth="2" />
            ))}
            <circle cx={cx} cy={cy} r={innerR - 2} fill="#080810" />
            <text x={cx} y={cy - 6} textAnchor="middle" fill="#00f5ff" fontSize="9" fontFamily="monospace" fontWeight="bold">
              รวม
            </text>
            <text x={cx} y={cy + 7} textAnchor="middle" fill="#f5e642" fontSize="9" fontFamily="monospace" fontWeight="bold">
              ฿{fmt(totalExpense)}
            </text>
          </svg>
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {segments.map((seg) => (
            <div key={seg.category} className="flex items-center gap-2 min-w-0">
              <span className="text-base flex-shrink-0">{seg.icon || "●"}</span>
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="font-mono text-[10px] text-[#aaaacc] truncate flex-1">{seg.category}</span>
              <span className="font-mono text-[10px] text-[#e74c3c] flex-shrink-0">
                ฿{fmt(seg.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── MonthlyBarChart (pure SVG) ────────────────────────────────────────────────
const MonthlyBarChart: React.FC<MonthlyBarChartProps> = ({ data }) => {
  const chartH = 120;
  const chartW = 280;
  const padL = 36;
  const padB = 24;
  const padT = 10;
  const innerW = chartW - padL - 8;
  const innerH = chartH - padB - padT;

  const maxVal = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1);
  const barGroupW = innerW / data.length;
  const barW = Math.min(barGroupW * 0.35, 16);
  const gap = barW * 0.3;

  const yTicks = [0, 0.5, 1].map((t) => ({ y: innerH - t * innerH, label: fmt(maxVal * t) }));

  return (
    <div className="bg-[#0d0d18] border border-[#1e1e30] rounded-xl mx-3 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[#00f5ff] text-xs font-bold">รายรับ vs รายจ่าย</span>
        <div className="flex gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-[#2ecc71] inline-block" />
            <span className="font-mono text-[10px] text-[#555577]">รายรับ</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-[#e74c3c] inline-block" />
            <span className="font-mono text-[10px] text-[#555577]">รายจ่าย</span>
          </div>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} style={{ maxWidth: chartW }}>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={padL} y1={padT + t.y} x2={chartW - 8} y2={padT + t.y} stroke="#1e1e30" strokeWidth="1" />
            <text x={padL - 4} y={padT + t.y + 3} textAnchor="end" fill="#555577" fontSize="7" fontFamily="monospace">
              {Number(maxVal * [0, 0.5, 1][i]) >= 1000 ? `${((maxVal * [0, 0.5, 1][i]) / 1000).toFixed(0)}k` : (maxVal * [0, 0.5, 1][i]).toFixed(0)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const gx = padL + i * barGroupW + barGroupW / 2;
          const incH = (d.income / maxVal) * innerH;
          const expH = (d.expense / maxVal) * innerH;
          return (
            <g key={d.month}>
              <rect
                x={gx - barW - gap / 2}
                y={padT + innerH - incH}
                width={barW}
                height={incH}
                fill="#2ecc71"
                rx="2"
              />
              <rect
                x={gx + gap / 2}
                y={padT + innerH - expH}
                width={barW}
                height={expH}
                fill="#e74c3c"
                rx="2"
              />
              <text
                x={gx}
                y={padT + innerH + 14}
                textAnchor="middle"
                fill="#555577"
                fontSize="8"
                fontFamily="monospace"
              >
                {d.month}
              </text>
            </g>
          );
        })}
        <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke="#1e1e30" strokeWidth="1" />
        <line x1={padL} y1={padT + innerH} x2={chartW - 8} y2={padT + innerH} stroke="#1e1e30" strokeWidth="1" />
      </svg>
    </div>
  );
};

// ── RecentTransactionList ─────────────────────────────────────────────────────
const RecentTransactionList: React.FC<RecentTransactionListProps> = ({ transactions }) => (
  <div className="bg-[#0d0d18] border border-[#1e1e30] rounded-xl mx-3 p-4">
    <span className="font-mono text-[#00f5ff] text-xs font-bold mb-3 block">รายการล่าสุด</span>
    {transactions.length === 0 ? (
      <span className="font-mono text-[#555577] text-xs">ไม่มีรายการ</span>
    ) : (
      <div className="flex flex-col gap-2">
        {transactions.map((tx) => (
          <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-[#1e1e30] last:border-0">
            <div className="flex-shrink-0 relative">
              <span className="text-xl">{tx.category?.icon || "💳"}</span>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#080810]"
                style={{ backgroundColor: tx.category?.color || (tx.type === "income" ? "#2ecc71" : "#e74c3c") }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[11px] text-[#ccccee] truncate">
                {tx.note || tx.category?.name || "—"}
              </p>
              <p className="font-mono text-[9px] text-[#555577]">{tx.date}</p>
            </div>
            <span
              className={`font-mono text-xs font-bold flex-shrink-0 ${tx.type === "income" ? "text-[#2ecc71]" : "text-[#e74c3c]"}`}
            >
              {tx.type === "income" ? "+" : "-"}฿{fmt(tx.amount)}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ── BudgetProgressList ────────────────────────────────────────────────────────
const BudgetProgressList: React.FC<BudgetProgressListProps> = ({ budgets }) => (
  <div className="bg-[#0d0d18] border border-[#1e1e30] rounded-xl mx-3 p-4">
    <span className="font-mono text-[#00f5ff] text-xs font-bold mb-3 block">งบประมาณ</span>
    {budgets.length === 0 ? (
      <span className="font-mono text-[#555577] text-xs">ไม่มีงบประมาณ</span>
    ) : (
      <div className="flex flex-col gap-4">
        {budgets.map((b) => {
          const pct = Math.min((b.spent / b.limit) * 100, 100);
          const barColor = pct < 70 ? "#2ecc71" : pct < 90 ? "#f5e642" : "#e74c3c";
          return (
            <div key={b.category}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">{b.icon || "📂"}</span>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: b.color }}
                  />
                  <span className="font-mono text-[11px] text-[#ccccee]">{b.category}</span>
                </div>
                <span className="font-mono text-[10px]" style={{ color: barColor }}>
                  {pct.toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-2 bg-[#1e1e30] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="font-mono text-[9px] text-[#555577]">฿{fmt(b.spent)}</span>
                <span className="font-mono text-[9px] text-[#555577]">฿{fmt(b.limit)}</span>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

// ── TransactionTypeToggle ─────────────────────────────────────────────────────
const TransactionTypeToggle: React.FC<TransactionTypeToggleProps> = ({ value, onChange }) => (
  <div className="flex bg-[#1e1e30] rounded-full p-1 mx-4">
    {(["income", "expense"] as const).map((t) => (
      <button
        key={t}
        onClick={() => onChange(t)}
        className={`flex-1 py-2 rounded-full font-mono text-sm font-bold transition-all ${
          value === t
            ? t === "income"
              ? "bg-[#2ecc71] text-[#080810]"
              : "bg-[#e74c3c] text-white"
            : "text-[#555577]"
        }`}
      >
        {t === "income" ? "รายรับ" : "รายจ่าย"}
      </button>
    ))}
  </div>
);

// ── QuickAmountKeypad ─────────────────────────────────────────────────────────
const QuickAmountKeypad: React.FC<QuickAmountKeypadProps> = ({
  amount, onAmountChange, selectedCategory, onCategorySelect, categories,
}) => {
  const keys = ["1","2","3","4","5","6","7","8","9",".","0","⌫"];
  const handleKey = (k: string) => {
    if (k === "⌫") { onAmountChange(amount.slice(0, -1) || "0"); return; }
    if (k === "." && amount.includes(".")) return;
    const next = amount === "0" && k !== "." ? k : amount + k;
    onAmountChange(next);
  };
  return (
    <div className="flex flex-col gap-3 px-4">
      <div className="bg-[#1e1e30] rounded-xl px-4 py-3 text-right">
        <span className="font-mono text-3xl font-bold text-[#f5e642]">฿{amount}</span>
      </div>
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategorySelect(cat.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition ${
                selectedCategory === cat.id
                  ? "border-[#00f5ff] bg-[#00f5ff11]"
                  : "border-[#1e1e30] bg-[#0d0d18]"
              }`}
            >
              <span className="text-lg">{cat.icon || "📂"}</span>
              <span className="font-mono text-[9px] text-[#aaaacc] whitespace-nowrap">{cat.name}</span>
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => handleKey(k)}
            className={`h-14 rounded-xl font-mono text-xl font-bold transition active:scale-95 ${
              k === "⌫"
                ? "bg-[#220d0d] text-[#e74c3c] border border-[#e74c3c33]"
                : "bg-[#0d0d18] border border-[#1e1e30] text-[#ccccee] hover:bg-[#1e1e30]"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
};

// ── ShorthandTextInput ────────────────────────────────────────────────────────
const ShorthandTextInput: React.FC<ShorthandTextInputProps> = ({ value, onChange, onParsed }) => {
  const parse = (v: string) => {
    const m = v.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
    if (m) onParsed(m[1].trim(), parseFloat(m[2]));
  };
  const parsed = /^.+\s+\d+(\.\d+)?$/.test(value.trim());
  return (
    <div className="px-4">
      <div className="relative">
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); parse(e.target.value); }}
          placeholder="เช่น: ข้าวเที่ยง 85"
          className="w-full bg-[#0d0d18] border border-[#1e1e30] rounded-xl px-4 py-3 font-mono text-sm text-[#ccccee] placeholder-[#555577] focus:outline-none focus:border-[#00f5ff] transition pr-10"
        />
        {value.length > 0 && (
          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono ${parsed ? "text-[#2ecc71]" : "text-[#555577]"}`}>
            {parsed ? "✓" : "…"}
          </span>
        )}
      </div>
      <p className="font-mono text-[9px] text-[#555577] mt-1 px-1">พิมพ์รายการ + จำนวนเงิน แล้วระบบจะดึงให้อัตโนมัติ</p>
    </div>
  );
};

// ── DatePickerField ───────────────────────────────────────────────────────────
const DatePickerField: React.FC<DatePickerFieldProps> = ({ value, onChange }) => (
  <div className="px-4">
    <label className="font-mono text-[10px] text-[#555577] mb-1 block">วันที่</label>
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#0d0d18] border border-[#1e1e30] rounded-xl px-4 py-3 font-mono text-sm text-[#ccccee] focus:outline-none focus:border-[#00f5ff] transition [color-scheme:dark]"
    />
  </div>
);

// ── SubmitButton ──────────────────────────────────────────────────────────────
const SubmitButton: React.FC<SubmitButtonProps> = ({ onSubmit, loading, disabled }) => (
  <div className="px-4">
    <button
      onClick={onSubmit}
      disabled={disabled || loading}
      className="w-full py-4 rounded-xl font-mono text-base font-bold bg-[#00f5ff] text-[#080810] hover:bg-[#00d4dd] transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {loading ? "กำลังบันทึก…" : "บันทึกรายการ"}
    </button>
  </div>
);

// ── BottomTabBar ──────────────────────────────────────────────────────────────
const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: "dashboard" as const, icon: "📊", label: "Dashboard" },
    { id: "add" as const, icon: "+", label: "เพิ่ม" },
    { id: "history" as const, icon: "📋", label: "History" },
    { id: "settings" as const, icon: "⚙️", label: "Settings" },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-[#0d0d18] border-t border-[#1e1e30] flex items-center justify-around px-2 pb-safe z-50">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onTabChange(t.id)}
          className={`flex flex-col items-center gap-0.5 py-2 px-3 flex-1 transition ${
            t.id === "add" ? "" : ""
          }`}
        >
          {t.id === "add" ? (
            <span
              className={`w-12 h-12 flex items-center justify-center rounded-full font-mono text-2xl font-black transition mb-0.5 shadow-lg ${
                activeTab === "add"
                  ? "bg-[#00f5ff] text-[#080810] scale-110"
                  : "bg-[#00f5ff22] border-2 border-[#00f5ff] text-[#00f5ff]"
              }`}
            >
              {t.icon}
            </span>
          ) : (
            <span className={`text-xl ${activeTab === t.id ? "opacity-100" : "opacity-40"}`}>{t.icon}</span>
          )}
          <span
            className={`font-mono text-[9px] ${
              t.id === "add"
                ? activeTab === "add" ? "text-[#00f5ff]" : "text-[#555577]"
                : activeTab === t.id ? "text-[#00f5ff]" : "text-[#555577]"
            }`}
          >
            {t.label}
          </span>
        </button>
      ))}
    </div>
  );
};

// ── AddSheet ──────────────────────────────────────────────────────────────────
const AddSheet: React.FC<{ categories: Category[]; onClose: () => void }> = ({ categories, onClose }) => {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("0");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const filtered = categories.filter((c) => c.type === type);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-[430px] bg-[#080810] border-t border-[#1e1e30] rounded-t-2xl pb-8 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#1e1e30]">
          <span className="font-mono text-[#00f5ff] font-bold text-sm">เพิ่มรายการ</span>
          <div className="w-10 h-1 rounded-full bg-[#1e1e30] absolute left-1/2 -translate-x-1/2 top-2" />
          <button onClick={onClose} className="font-mono text-[#555577] text-sm hover:text-[#00f5ff]">✕</button>
        </div>
        <div className="flex flex-col gap-4 pt-4">
          <TransactionTypeToggle value={type} onChange={setType} />
          <QuickAmountKeypad
            amount={amount}
            onAmountChange={setAmount}
            selectedCategory={selectedCat}
            onCategorySelect={setSelectedCat}
            categories={filtered}
          />
          <ShorthandTextInput
            value={note}
            onChange={setNote}
            onParsed={(n, a) => { setNote(n); setAmount(String(a)); }}
          />
          <DatePickerField value={date} onChange={setDate} />
          <SubmitButton onSubmit={() => alert(`บันทึก: ${type} ฿${amount} ${note} ${date}`)} />
        </div>
      </div>
    </div>
  );
};

// ── Main FinanceDashboard Component ───────────────────────────────────────────
export default function FinanceDashboard({
  monthLabel, year, onPrevMonth, onNextMonth,
  totalIncome, totalExpense, netBalance,
  donutSegments, barData, recentTransactions, budgets,
  activeTab: _activeTab, onTabChange: _onTabChange,
  addFormCategories,
}: FinanceDashboardProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "add" | "history" | "settings">(_activeTab);
  const [showAdd, setShowAdd] = useState(false);

  const handleTab = (tab: "dashboard" | "add" | "history" | "settings") => {
    if (tab === "add") { setShowAdd(true); return; }
    setActiveTab(tab);
    _onTabChange(tab);
  };

  return (
    <div className="relative min-h-screen bg-[#080810] font-mono flex flex-col items-center justify-start">
      <div className="w-full max-w-[430px] min-h-screen flex flex-col bg-[#080810] pb-24">
        {activeTab === "dashboard" && (
          <div className="flex flex-col gap-3 pb-4">
            <MonthNavigatorHeader
              currentMonth={monthLabel}
              currentYear={year}
              onPrev={onPrevMonth}
              onNext={onNextMonth}
            />
            <SummaryCards totalIncome={totalIncome} totalExpense={totalExpense} netBalance={netBalance} />
            <ExpenseDonutChart segments={donutSegments} totalExpense={totalExpense} />
            <MonthlyBarChart data={barData} />
            <RecentTransactionList transactions={recentTransactions} />
            <BudgetProgressList budgets={budgets} />
          </div>
        )}
        {activeTab === "history" && (
          <div className="flex flex-col gap-3 p-4">
            <span className="font-mono text-[#00f5ff] font-bold text-sm">ประวัติรายการ</span>
            <RecentTransactionList transactions={recentTransactions} />
          </div>
        )}
        {activeTab === "settings" && (
          <div className="flex flex-col gap-3 p-4">
            <span className="font-mono text-[#00f5ff] font-bold text-sm">ตั้งค่า</span>
            <div className="bg-[#0d0d18] border border-[#1e1e30] rounded-xl p-4">
              <span className="font-mono text-[#555577] text-xs">เวอร์ชัน 1.0.0</span>
            </div>
          </div>
        )}
        <BottomTabBar activeTab={activeTab} onTabChange={handleTab} />
      </div>
      {showAdd && (
        <AddSheet categories={addFormCategories} onClose={() => setShowAdd(false)} />
      )}
    </div>
  );
}

// --- STORY ---
// FinanceDashboard renders a full mobile-first finance dashboard at max-width 430px.
// It includes MonthNavigatorHeader for month navigation, SummaryCards for income/expense/balance,
// ExpenseDonutChart (pure SVG donut) for category breakdown, MonthlyBarChart (pure SVG) for
// 6-month income vs expense, RecentTransactionList for last 10 transactions,
// BudgetProgressList for per-category budget progress, BottomTabBar for navigation,
// and an AddSheet bottom sheet with TransactionTypeToggle, QuickAmountKeypad,
// ShorthandTextInput (with Thai shorthand auto-parse), DatePickerField, and SubmitButton.
// All data is passed as props; no useEffect or data fetching inside components.

// --- PREVIEW ---
{
  "preview_props": {
    "monthLabel": "มกราคม",
    "year": 2025,
    "onPrevMonth": "__NOOP__",
    "onNextMonth": "__NOOP__",
    "totalIncome": 55000,
    "totalExpense": 32450,
    "netBalance": 22550,
    "donutSegments": [
      { "category": "อาหาร", "amount": 8500, "color": "#e74c3c", "icon": "🍜" },
      { "category": "เดินทาง", "amount": 4200, "color": "#f5e642", "icon": "🚗" },
      { "category": "ช้อปปิ้ง", "amount": 6800, "color": "#9b59b6", "icon": "🛍️" },
      { "category": "บันเทิง", "amount": 3150, "color": "#00f5ff", "icon": "🎬" },
      { "category": "สาธารณูปโภค", "amount": 5200, "color": "#e67e22", "icon": "💡" },
      { "category": "อื่นๆ", "amount": 4600, "color": "#555577", "icon": "📦" }
    ],
    "barData": [
      { "month": "ส.ค.", "income": 48000, "expense": 29000 },
      { "month": "ก.ย.", "income": 52000, "expense": 34000 },
      { "month": "ต.ค.", "income": 50000, "expense": 31500 },
      { "month": "พ.ย.", "income": 47000, "expense": 28000 },
      { "month": "ธ.ค.", "income": 61000, "expense": 42000 },
      { "month": "ม.ค.", "income": 55000, "expense": 32450 }
    ],
    "recentTransactions": [
      { "id": "t1", "type": "expense", "amount": 120, "category_id": "c1", "note": "ข้าวกะเพราหมูสับ", "date": "2025-01-15", "category": { "id": "c1", "name": "อาหาร", "type": "expense", "icon": "🍜", "color": "#e74c3c" } },
      { "id": "t2", "type": "income", "amount": 55000, "category_id": "c2", "note": "เงินเดือน", "date": "2025-01-01", "category": { "id": "c2", "name": "เงินเดือน", "type": "income", "icon": "💰", "color": "#2ecc71" } },
      { "id": "t3", "type": "expense", "amount": 350, "category_id": "c3", "note": "แท็กซี่ไปออฟฟิศ", "date": "2025-01-14", "category": { "id": "c3", "name": "เดินทาง", "type": "expense", "icon": "🚗", "color": "#f5e642" } },
      { "id": "t4", "type": "expense", "amount": 1290, "category_id": "c4", "note": "เสื้อยืด Uniqlo", "date": "2025-01-13", "category": { "id": "c4", "name": "ช้อปปิ้ง", "type": "expense", "icon": "🛍️", "color": "#9b59b6" } },
      { "id": "t5", "type": "expense", "amount": 250, "category_id": "c5", "note": "Netflix", "date": "2025-01-12", "category": { "id": "c5", "name": "บันเทิง", "type": "expense", "icon": "🎬", "color": "#00f5ff" } }
    ],
    "budgets": [
      { "category": "อาหาร", "icon": "🍜", "color": "#e74c3c", "spent": 8500, "limit": 12000 },
      { "category": "เดินทาง", "icon": "🚗", "color": "#f5e642", "spent": 4200, "limit": 5000 },
      { "category": "ช้อปปิ้ง", "icon": "🛍️", "color": "#9b59b6", "spent": 6800, "limit": 7000 },
      { "category": "บันเทิง", "icon": "🎬", "color": "#00f5ff", "spent": 3150, "limit": 4000 },
      { "category": "สาธารณูปโภค", "icon": "💡", "color": "#e67e22", "spent": 5200, "limit": 5500 }
    ],
    "activeTab": "dashboard",
    "onTabChange": "__NOOP__",
    "addFormCategories": [
      { "id": "c1", "name": "อาหาร", "type": "expense", "icon": "🍜", "color": "#e74c3c" },
      { "id": "c3", "name": "เดินทาง", "type": "expense", "icon": "🚗", "color": "#f5e642" },
      { "id": "c4", "name": "ช้อปปิ้ง", "type": "expense", "icon": "🛍️", "color": "#9b59b6" },
      { "id": "c5", "name": "บันเทิง", "type": "expense", "icon": "🎬", "color": "#00f5ff" },
      { "id": "c2", "name": "เงินเดือน", "type": "income", "icon": "💰", "color": "#2ecc71" }
    ]
  },
  "dependencies": []
}