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
	Package,
	Sparkles,
	MoreHorizontal,
	GripVertical,
	Layers,
	Construction,
	LucideIcon,
} from "lucide-react";
import Calendar, { EventRow } from "./calendar";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ExpenseRow {
	month: string;
	amount: number;
	budget: number;
}

export interface OrderRow {
	id: string;
	item: string;
	shop_name: string;
	amount: number;
	currency: string;
	status: "ordered" | "shipped_dom" | "shipped_intl" | "received";
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
	shop: string;
	amount: string;
	time: string;
}

interface KanbanColumn {
	id: string;
	label: string;
	color: string;
	bg: string;
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
	accent: string;
}

interface DashboardProps {
	expenses: ExpenseRow[];
	orders: OrderRow[];
	events: EventRow[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const KANBAN_COLUMNS: Omit<KanbanColumn, "cards">[] = [
	{ id: "ordered", label: "Ordered", color: "#a78bfa", bg: "#f5f3ff" },
	{ id: "shipped_dom", label: "Shipped Domestically", color: "#60a5fa", bg: "#eff6ff" },
	{ id: "shipped_intl", label: "Shipped Internationally", color: "#f59e0b", bg: "#fffbeb" },
	{ id: "received", label: "Received", color: "#34d399", bg: "#ecfdf5" },
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
	{ label: "Total Revenue", value: "$84,201", delta: "+12.4%", up: true, accent: "#fda4af" },
	{ label: "Active Users", value: "4,721", delta: "+8.1%", up: true, accent: "#a5b4fc" },
	{ label: "Orders", value: "1,349", delta: "-2.3%", up: false, accent: "#86efac" },
	{ label: "Avg. Order Value", value: "$62.40", delta: "+5.7%", up: true, accent: "#fcd34d" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

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
		<div className="bg-white border border-stone-100 rounded-xl px-3 py-2 text-xs shadow-lg">
			<p className="text-stone-400 mb-1 font-medium">{label}</p>
			{payload.map((p, i) => (
				<p key={i} style={{ color: p.color }} className="font-semibold">
					{p.name}: ${((p.value ?? 0) / 1000).toFixed(1)}k
				</p>
			))}
		</div>
	);
};

function SkeletonBlock({ className }: { className?: string }) {
	return <div className={`bg-stone-100 animate-pulse rounded-xl ${className ?? ""}`} />;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Dashboard({ expenses, orders, events }: DashboardProps) {
	const [activeNav, setActiveNav] = useState<string>("Dashboard");
	const [searchVal, setSearchVal] = useState<string>("");

	const expenseData = buildExpenseData(expenses);
	const kanbanCols = buildKanbanColumns(orders);
	const latestExp = getLatestExpense(expenseData);
	const totalOrders = kanbanCols.reduce((a, c) => a + c.cards.length, 0);

	return (
		<div className="flex h-screen bg-[#faf9f6] text-stone-700 overflow-hidden font-murecho">
			{/* ── Main ── */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* Topbar */}
				<header className="h-16 bg-white border-b border-stone-100 flex items-center justify-between px-6 shrink-0 shadow-sm">
					<div className="flex items-center gap-2 text-sm text-stone-400">
						<span className="font-medium text-stone-600">Dashboard</span>
						<ChevronRight size={14} />
						<span>Overview</span>
					</div>
					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2 bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-sm">
							<Search size={14} className="text-stone-300" />
							<input
								value={searchVal}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchVal(e.target.value)}
								placeholder="Search..."
								className="bg-transparent outline-none text-stone-600 placeholder-stone-300 w-40 text-sm"
							/>
						</div>
						<button className="relative p-2 rounded-xl hover:bg-stone-50 transition-colors">
							<Bell size={16} className="text-stone-400" />
							<span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-400 rounded-full border-2 border-white" />
						</button>
					</div>
				</header>

				{/* Content */}
				<main className="flex-1 overflow-y-auto p-6 space-y-5">
					{/* Page title */}
					<div>
						<h1 className="text-2xl font-bold text-stone-800 tracking-tight font-unbounded">
							Good morning ✨
						</h1>
					</div>

					{/* Stat cards */}
					<div className="grid grid-cols-4 gap-4">
						{statCards.map(({ label, value, delta, up, accent }) => (
							<div
								key={label}
								className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 relative overflow-hidden"
							>
								<div
									className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20"
									style={{ backgroundColor: accent }}
								/>
								<p className="text-xs text-stone-400 font-medium mb-3">{label}</p>
								<p className="text-2xl font-bold text-stone-800 mb-2">{value}</p>
								<div className="flex items-center gap-1.5">
									{up ? (
										<TrendingUp size={12} className="text-emerald-400" />
									) : (
										<TrendingDown size={12} className="text-red-400" />
									)}
									<span
										className={`text-xs font-semibold ${up ? "text-emerald-500" : "text-red-400"}`}
									>
										{delta}
									</span>
									<span className="text-xs text-stone-300">vs last period</span>
								</div>
							</div>
						))}
					</div>

					{/* ── Row 1: Calendar + Expense Chart ── */}
					<div className="grid grid-cols-5 gap-4">
						{/* Calendar (Supabase) */}
						<Calendar initialEvents={events} />
						{/* Kanban */}
						<div className="col-span-3 bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
							<div className="flex items-center justify-between mb-4">
								<div>
									<p className="text-xs text-stone-400 font-medium">Pipeline</p>
									<p className="text-base font-bold text-stone-800 mt-0.5">Order Status</p>
								</div>
								<div className="flex items-center gap-1.5 text-xs text-stone-400">
									<Layers size={13} />
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
												<span className="text-xs font-medium text-stone-400">{col.label}</span>
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
												<span className="text-xs font-semibold text-stone-500">
													{col.label}
												</span>
												<span className="ml-auto text-xs text-stone-300 font-medium">
													{col.cards.length}
												</span>
											</div>

											<div className="space-y-2">
												{col.cards.map((card: KanbanCard) => (
													<div
														key={card.id}
														className="rounded-xl p-3 group hover:shadow-md transition-all cursor-grab active:cursor-grabbing border border-stone-100"
														style={{ backgroundColor: col.bg }}
													>
														<div className="flex items-start justify-between gap-1 mb-1.5">
															<span
																className="text-[11px] font-bold"
																style={{ color: col.color }}
															>
																{card.item}
															</span>
															<GripVertical
																size={10}
																className="text-stone-300 group-hover:text-stone-400 mt-0.5 shrink-0"
															/>
														</div>
														<p className="text-xs text-stone-500 leading-tight mb-1.5">
															{card.shop}
														</p>
														<div className="flex items-center justify-between">
															<span className="text-xs font-bold text-stone-700">
																{card.amount}
															</span>
															<span className="text-[10px] text-stone-400">
																{card.time}
															</span>
														</div>
													</div>
												))}

												<div className="border-2 border-dashed border-stone-100 rounded-xl h-10 flex items-center justify-center">
													<span className="text-[10px] text-stone-300 font-medium">
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

					{/* ── Row 2: Kanban + Placeholder ── */}
					<div className="grid grid-cols-3 gap-4">
						{/* Expense Line Chart */}
						<div className="col-span-2 bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
							<div className="flex items-center justify-between mb-4">
								<div>
									<p className="text-xs text-stone-400 font-medium">Finance</p>
									<p className="text-base font-bold text-stone-800 mt-0.5">Monthly Expenses</p>
								</div>
								<div className="flex items-center gap-4 text-xs text-stone-400">
									<span className="flex items-center gap-1.5">
										<span className="w-3 h-3 rounded-full bg-rose-300 inline-block" />
										Actual
									</span>
									<span className="flex items-center gap-1.5">
										<span className="w-3 h-3 rounded-full bg-stone-200 inline-block" />
										Budget
									</span>
									<button className="text-stone-300 hover:text-stone-400 transition-colors">
										<MoreHorizontal size={14} />
									</button>
								</div>
							</div>

							{expenseData.length === 0 ? (
								<div className="space-y-3 mt-2">
									<SkeletonBlock className="h-4 w-32" />
									<SkeletonBlock className="h-40 w-full" />
								</div>
							) : (
								<>
									<div className="mb-3 flex items-end gap-3">
										<span className="text-2xl font-bold text-stone-800">
											{latestExp ? formatCurrencyDefault(latestExp.amount) : "—"}
										</span>
										{latestExp && latestExp.overBudget !== 0 && (
											<span
												className={`text-xs mb-1 flex items-center gap-1 font-medium ${latestExp.overBudget > 0 ? "text-red-400" : "text-emerald-500"}`}
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
											<CartesianGrid vertical={false} stroke="#f5f5f4" strokeDasharray="4 4" />
											<XAxis
												dataKey="m"
												tick={{ fill: "#a8a29e", fontSize: 11 }}
												axisLine={false}
												tickLine={false}
											/>
											<YAxis
												tick={{ fill: "#a8a29e", fontSize: 11 }}
												axisLine={false}
												tickLine={false}
												tickFormatter={(v: number) => `$${v / 1000}k`}
											/>
											<Tooltip content={<CustomTooltip />} />
											<Line
												type="monotone"
												dataKey="budget"
												name="Budget"
												stroke="#e7e5e4"
												strokeWidth={2}
												strokeDasharray="4 3"
												dot={false}
											/>
											<Line
												type="monotone"
												dataKey="exp"
												name="Actual"
												stroke="#fb7185"
												strokeWidth={2.5}
												dot={{ fill: "#fb7185", r: 3, strokeWidth: 0 }}
												activeDot={{ r: 5, fill: "#fb7185", strokeWidth: 0 }}
											/>
										</LineChart>
									</ResponsiveContainer>
								</>
							)}
						</div>
						{/* Placeholder */}
						<div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex flex-col">
							<div className="mb-4">
								<p className="text-xs text-stone-400 font-medium">Coming Soon</p>
								<p className="text-base font-bold text-stone-800 mt-0.5">New Section</p>
							</div>
							<div className="flex-1 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-stone-100 rounded-2xl p-6">
								<div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
									<Construction size={20} className="text-rose-300" />
								</div>
								<div className="text-center">
									<p className="text-sm font-medium text-stone-500 mb-1">Under construction</p>
									<p className="text-xs text-stone-300 leading-relaxed">
										This spot is reserved for a future widget.
									</p>
								</div>
								<button className="px-4 py-2 text-xs font-medium rounded-xl bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors">
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
