import { createClient } from "@supabase/supabase-js";
import Dashboard, { ExpenseRow, OrderRow } from "./components/dashboard";

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

// ── Page (React Server Component) ────────────────────────────────────────────

export default async function Page() {
	const [expenses, orders] = await Promise.all([fetchExpenses(), fetchOrders()]);

	return <Dashboard expenses={expenses} orders={orders} />;
}
