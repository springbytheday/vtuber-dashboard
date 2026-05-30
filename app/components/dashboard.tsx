"use client";

import { useState } from "react";
import {
	LayoutDashboard,
	BarChart3,
	Users,
	ShoppingCart,
	Settings,
	Bell,
	Search,
	TrendingUp,
	TrendingDown,
	ChevronRight,
	ChevronLeft,
	Package,
	Zap,
	MoreHorizontal,
	GripVertical,
	Clock,
	Layers,
	Construction,
	LucideIcon,
	AlertCircle,
	Loader2,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, TooltipProps } from "recharts";
import { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import YoutubeCalendar from "./youtubecalendar";

// ── Types ────────────────────────────────────────────────────────────────────

// Matches the `expenses` table:
//   id         uuid primary key
//   month      text          e.g. "Jan", "Feb"
//   month_date date          e.g. 2025-01-01 (used for ordering)
//   amount     numeric       actual spend
//   budget     numeric       budget ceiling
export interface ExpenseRow {
	month: string;
	amount: number;
	budget: number;
}

// Matches the `orders` table:
//   id            uuid primary key
//   order_ref     text          e.g. "#ORD-8830"
//   customer_name text
//   amount        numeric
//   status        text          one of: new | processing | shipped | delivered
//   created_at    timestamptz
export interface OrderRow {
	id: string;
	item: string;
	shop_name: string;
	amount: number;
	status: "ordered" | "shipped_dom" | "shipped_intl" | "received";
	currency: string;
	created_at: string;
}

interface ExpenseEntry {
	m: string;
	exp: number;
	budget: number;
}

interface KanbanCard {
	id: string;
	item: string;
	amount: string;
	time: string;
	shop: string;
}

interface KanbanColumn {
	id: string;
	label: string;
	color: string;
	cards: KanbanCard[];
}

interface NavItem {
	icon: LucideIcon;
	label: string;
}

interface StatCard {
	label: string;
	value: string;
	delta: string;
	up: boolean;
}

interface DashboardProps {
	expenses: ExpenseRow[];
	orders: OrderRow[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const KANBAN_COLUMNS: Omit<KanbanColumn, "cards">[] = [
	{ id: "ordered", label: "Ordered", color: "#a78bfa" },
	{ id: "shipped_dom", label: "Shipped Domestically", color: "#38bdf8" },
	{ id: "shipped_intl", label: "Shipped Internationally", color: "#e8ff47" },
	{ id: "received", label: "Received", color: "#4ade80" },
];

const navItems: NavItem[] = [
	{ icon: LayoutDashboard, label: "Dashboard" },
	{ icon: BarChart3, label: "Analytics" },
	{ icon: Users, label: "Customers" },
	{ icon: ShoppingCart, label: "Orders" },
	{ icon: Package, label: "Products" },
	{ icon: Settings, label: "Settings" },
];

const statCards: StatCard[] = [
	{ label: "Total Revenue", value: "$84,201", delta: "+12.4%", up: true },
	{ label: "Active Users", value: "4,721", delta: "+8.1%", up: true },
	{ label: "Orders", value: "1,349", delta: "-2.3%", up: false },
	{ label: "Avg. Order Value", value: "$62.40", delta: "+5.7%", up: true },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
	const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
	if (diff < 60) return `${diff}s ago`;
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	return `${Math.floor(diff / 86400)}d ago`;
}

function formatCurrency(amount: number, currency: string): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency,
		maximumFractionDigits: 0,
	}).format(amount);
}

function formatCurrencyDefault(amount: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "JPY",
		maximumFractionDigits: 0,
	}).format(amount);
}

function buildKanbanColumns(orders: OrderRow[]): KanbanColumn[] {
	return KANBAN_COLUMNS.map((col) => ({
		...col,
		cards: orders
			.filter((o) => o.status === col.id)
			.map((o) => ({
				id: o.id,
				item: o.item,
				shop: o.shop_name,
				amount: formatCurrency(o.amount, o.currency),
				time: formatRelativeTime(o.created_at),
			})),
	}));
}

function buildExpenseData(expenses: ExpenseRow[]): ExpenseEntry[] {
	return expenses.map((e) => ({ m: e.month, exp: e.amount, budget: e.budget }));
}

function getLatestExpense(data: ExpenseEntry[]): { amount: number; overBudget: number } | null {
	if (!data.length) return null;
	const last = data[data.length - 1];
	return { amount: last.exp, overBudget: last.exp - last.budget };
}

// ── Sub-components ────────────────────────────────────────────────────────────
interface TooltipPayloadEntry {
	name?: string;
	value?: number;
	color?: string;
}

interface CustomTooltipProps {
	active?: boolean;
	payload?: TooltipPayloadEntry[];
	label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
	if (!active || !payload?.length) return null;
	return (
		<div className="bg-[#1a1a1f] border border-[#2a2a32] px-3 py-2 text-xs font-mono">
			<p className="text-[#888] mb-1">{label}</p>
			{payload.map((p, i) => (
				<p key={i} style={{ color: p.color }}>
					{p.name}: ${((p.value ?? 0) / 1000).toFixed(1)}k
				</p>
			))}
		</div>
	);
};

function ErrorBanner({ message }: { message: string }) {
	return (
		<div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
			<AlertCircle size={12} /> {message}
		</div>
	);
}

function SkeletonBlock({ className }: { className?: string }) {
	return <div className={`bg-[#1e1e26] animate-pulse ${className ?? ""}`} />;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Dashboard({ expenses, orders }: DashboardProps) {
	const [activeNav, setActiveNav] = useState<string>("Dashboard");
	const [searchVal, setSearchVal] = useState<string>("");

	const expenseData = buildExpenseData(expenses);
	const kanbanCols = buildKanbanColumns(orders);
	const latestExp = getLatestExpense(expenseData);
	const totalOrders = kanbanCols.reduce((a, c) => a + c.cards.length, 0);

	return (
		<div className="flex h-screen bg-[#0e0e12] text-[#d4d4d8] overflow-hidden">
			{/* ── Main ── */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* Topbar */}
				<header className="h-14 border-b border-[#1e1e26] flex items-center justify-between px-6 shrink-0">
					<div className="flex items-center gap-2 text-xs text-[#555]">
						<span>Dashboard</span>
						<ChevronRight size={12} />
						<span className="text-[#aaa]">Overview</span>
					</div>
					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2 bg-[#16161c] border border-[#242430] px-3 py-1.5 text-xs">
							<Search size={12} className="text-[#555]" />
							<input
								value={searchVal}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchVal(e.target.value)}
								placeholder="Search..."
								className="bg-transparent outline-none text-[#aaa] placeholder-[#444] w-40 text-xs"
							/>
						</div>
						<button className="relative p-2 hover:bg-white/5 transition-colors">
							<Bell size={15} className="text-[#666]" />
							<span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#e8ff47] rounded-full" />
						</button>
					</div>
				</header>

				{/* Content */}
				<main className="flex-1 overflow-y-auto p-6 space-y-5">
					<div>
						<h1 className="text-xl font-bold text-white tracking-tight">Overview</h1>
					</div>

					{/* Stat cards (static) */}
					<div className="grid grid-cols-4 gap-4">
						{statCards.map(({ label, value, delta, up }) => (
							<div
								key={label}
								className="bg-[#13131a] border border-[#1e1e26] p-4 relative overflow-hidden"
							>
								<div className="absolute top-0 right-0 w-16 h-16 bg-linear-to-br from-[#e8ff47]/5 to-transparent" />
								<p className="text-[10px] uppercase tracking-widest text-[#555] mb-3">{label}</p>
								<p className="text-2xl font-bold text-white mb-2">{value}</p>
								<div className="flex items-center gap-1.5">
									{up ? (
										<TrendingUp size={11} className="text-emerald-400" />
									) : (
										<TrendingDown size={11} className="text-red-400" />
									)}
									<span
										className={`text-[11px] font-bold ${up ? "text-emerald-400" : "text-red-400"}`}
									>
										{delta}
									</span>
									<span className="text-[10px] text-[#444]">vs last period</span>
								</div>
							</div>
						))}
					</div>

					{/* ── Row 1: Calendar + Kanban ── */}
					<div className="grid grid-cols-5 gap-4">
						{/* Calendar (static) */}
						<div className="col-span-2 bg-[#13131a] border border-[#1e1e26] p-5">
							<YoutubeCalendar />
						</div>
						{/* Kanban (Supabase) */}
						<div className="col-span-3 bg-[#13131a] border border-[#1e1e26] p-5">
							<div className="flex items-center justify-between mb-4">
								<div>
									<p className="text-[10px] uppercase tracking-widest text-[#555]">Pipeline</p>
									<p className="text-sm font-bold text-white mt-0.5">Order Status</p>
								</div>
								<div className="flex items-center gap-1.5 text-[10px] text-[#555]">
									<Layers size={11} />
									<span>{totalOrders} orders</span>
								</div>
							</div>

							{totalOrders === 0 ? (
								<div className="grid grid-cols-4 gap-3">
									{KANBAN_COLUMNS.map((col) => (
										<div key={col.id}>
											<div className="flex items-center gap-2 mb-2.5">
												<span
													className="w-2 h-2 rounded-full"
													style={{ backgroundColor: col.color }}
												/>
												<span className="text-[10px] uppercase tracking-widest text-[#666]">
													{col.label}
												</span>
											</div>
											<SkeletonBlock className="h-16 w-full mb-2" />
											<SkeletonBlock className="h-16 w-full" />
										</div>
									))}
								</div>
							) : (
								<div className="grid grid-cols-4 gap-3">
									{kanbanCols.map((col: KanbanColumn) => (
										<div key={col.id}>
											<div className="flex items-center gap-2 mb-2.5">
												<span
													className="w-2 h-2 rounded-full"
													style={{ backgroundColor: col.color }}
												/>
												<span className="text-[10px] uppercase tracking-widest text-[#666]">
													{col.label}
												</span>
												<span className="ml-auto text-[10px] text-[#444]">
													{col.cards.length}
												</span>
											</div>

											<div className="space-y-2">
												{col.cards.map((card: KanbanCard) => (
													<div
														key={card.id}
														className="bg-[#0e0e12] border border-[#1e1e26] p-3 group hover:border-[#2a2a32] transition-colors cursor-grab active:cursor-grabbing"
													>
														<div className="flex items-start justify-between gap-1 mb-2">
															<span
																className="text-[10px] font-bold"
																style={{ color: col.color }}
															>
																{card.item}
															</span>
															<GripVertical
																size={10}
																className="text-[#333] group-hover:text-[#555] mt-0.5 shrink-0"
															/>
														</div>
														<p className="text-[11px] text-[#aaa] leading-tight mb-1">
															{card.shop}
														</p>
														<div className="flex items-center justify-between">
															<span className="text-[11px] font-bold text-white">
																{card.amount}
															</span>
															<span className="text-[10px] text-[#444]">{card.time}</span>
														</div>
													</div>
												))}

												<div className="border border-dashed border-[#222] h-8 flex items-center justify-center">
													<span className="text-[9px] text-[#333] uppercase tracking-widest">
														drop here
													</span>
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					{/* ── Row 2: Expenses + Placeholder ── */}
					<div className="grid grid-cols-3 gap-4">
						{/* Expense Line Chart (Supabase) */}
						<div className="col-span-2 bg-[#13131a] border border-[#1e1e26] p-5">
							<div className="flex items-center justify-between mb-4">
								<div>
									<p className="text-[10px] uppercase tracking-widest text-[#555]">Finance</p>
									<p className="text-sm font-bold text-white mt-0.5">Monthly Expenses</p>
								</div>
								<div className="flex items-center gap-4 text-[10px] text-[#555]">
									<span className="flex items-center gap-1.5">
										<span className="w-4 h-px bg-[#e8ff47] inline-block" />
										Actual
									</span>
									<span className="flex items-center gap-1.5">
										<span className="w-4 h-px bg-[#333] inline-block border-t border-dashed border-[#555]" />
										Budget
									</span>
									<button className="text-[#555] hover:text-[#888]">
										<MoreHorizontal size={13} />
									</button>
								</div>
							</div>

							{expenseData.length === 0 ? (
								<div className="space-y-2 mt-2">
									<SkeletonBlock className="h-4 w-32" />
									<SkeletonBlock className="h-40 w-full" />
								</div>
							) : (
								<>
									<div className="mb-2 flex items-end gap-3">
										<span className="text-2xl font-bold text-white">
											{latestExp ? formatCurrencyDefault(latestExp.amount) : "—"}
										</span>
										{latestExp && latestExp.overBudget !== 0 && (
											<span
												className={`text-xs mb-1 flex items-center gap-1 ${latestExp.overBudget > 0 ? "text-red-400" : "text-emerald-400"}`}
											>
												{latestExp.overBudget > 0 ? (
													<>
														<TrendingUp size={11} /> +
														{formatCurrencyDefault(latestExp.overBudget)} over budget
													</>
												) : (
													<>
														<TrendingDown size={11} />{" "}
														{formatCurrencyDefault(Math.abs(latestExp.overBudget))} under
														budget
													</>
												)}
											</span>
										)}
									</div>

									<ResponsiveContainer width="100%" height={170}>
										<LineChart
											data={expenseData}
											margin={{ top: 4, right: 4, left: -18, bottom: 0 }}
										>
											<CartesianGrid vertical={false} stroke="#1e1e26" strokeDasharray="3 3" />
											<XAxis
												dataKey="m"
												tick={{ fill: "#555", fontSize: 10 }}
												axisLine={false}
												tickLine={false}
											/>
											<YAxis
												tick={{ fill: "#555", fontSize: 10 }}
												axisLine={false}
												tickLine={false}
												tickFormatter={(v: number) => `$${v / 1000}k`}
											/>
											<Tooltip content={<CustomTooltip />} />
											<Line
												type="monotone"
												dataKey="budget"
												name="Budget"
												stroke="#333"
												strokeWidth={1}
												strokeDasharray="4 3"
												dot={false}
											/>
											<Line
												type="monotone"
												dataKey="exp"
												name="Actual"
												stroke="#e8ff47"
												strokeWidth={2}
												dot={{ fill: "#e8ff47", r: 3, strokeWidth: 0 }}
												activeDot={{ r: 5, fill: "#e8ff47", strokeWidth: 0 }}
											/>
										</LineChart>
									</ResponsiveContainer>
								</>
							)}
						</div>
						{/* Placeholder */}
						<div className="bg-[#13131a] border border-[#1e1e26] p-5 flex flex-col">
							<div className="mb-4">
								<p className="text-[10px] uppercase tracking-widest text-[#555]">Coming Soon</p>
								<p className="text-sm font-bold text-white mt-0.5">Section Placeholder</p>
							</div>
							<div className="flex-1 flex flex-col items-center justify-center gap-4 border border-dashed border-[#222] p-6">
								<div className="w-12 h-12 border border-[#2a2a32] flex items-center justify-center">
									<Construction size={20} className="text-[#333]" />
								</div>
								<div className="text-center">
									<p className="text-xs text-[#555] mb-1">Under construction</p>
									<p className="text-[10px] text-[#333] leading-relaxed">
										This section is reserved for a future widget or module.
									</p>
								</div>
								<button className="mt-2 px-4 py-1.5 text-[10px] uppercase tracking-widest border border-[#2a2a32] text-[#555] hover:border-[#444] hover:text-[#888] transition-colors">
									Configure
								</button>
							</div>
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}
