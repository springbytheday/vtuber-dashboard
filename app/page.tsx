import { createClient } from "@supabase/supabase-js";
import Dashboard, { ExpenseRow, OrderRow } from "./components/dashboard";
import { EventRow } from "./components/calendar";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchExpenses(): Promise<ExpenseRow[]> {
	const { data, error } = await supabase
		.from("expenses")
		.select("month, amount, budget")
		.order("month_date", { ascending: true });

	if (error) {
		console.error("[expenses]", error.message);
		return [];
	}

	return (data ?? []) as ExpenseRow[];
}

async function fetchOrders(): Promise<OrderRow[]> {
	const { data, error } = await supabase
		.from("orders")
		.select("id, item, shop_name, currency, amount, status, created_at")
		.order("created_at", { ascending: false })
		.limit(50);

	if (error) {
		console.error("[orders]", error.message);
		return [];
	}

	return (data ?? []) as OrderRow[];
}

async function fetchEvents(): Promise<EventRow[]> {
	// Fetch events for a rolling 3-month window (past month → next 2 months)
	const from = new Date();
	from.setMonth(from.getMonth() - 1);
	from.setDate(1);

	const to = new Date();
	to.setMonth(to.getMonth() + 2);
	to.setDate(0); // last day of that month

	const { data, error } = await supabase
		.from("events")
		.select("id, title, start_at, end_at")
		.gte("start_at", from.toISOString())
		.lte("end_at", to.toISOString())
		.order("start_at", { ascending: true });

	if (error) {
		console.error("[events]", error.message);
		return [];
	}
	return (data ?? []) as EventRow[];
}

// ── Page (React Server Component) ────────────────────────────────────────────

export default async function Page() {
	const [expenses, orders, events] = await Promise.all([fetchExpenses(), fetchOrders(), fetchEvents()]);

	return <Dashboard expenses={expenses} orders={orders} events={events} />;
}
