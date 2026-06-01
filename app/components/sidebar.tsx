"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart3, Users, ShoppingCart, Settings, Package, Sparkles, LucideIcon } from "lucide-react";

interface NavItem {
	icon: LucideIcon;
	label: string;
	href: string;
}

const navItems: NavItem[] = [
	{ icon: LayoutDashboard, label: "Dashboard", href: "/" },
	{ icon: BarChart3, label: "Analytics", href: "/analytics" },
	{ icon: Users, label: "Customers", href: "/customers" },
	{ icon: ShoppingCart, label: "Orders", href: "/orders" },
	{ icon: Package, label: "Products", href: "/products" },
	{ icon: Settings, label: "Settings", href: "/settings" },
];

export default function Sidebar() {
	const pathname = usePathname();

	const isActive = (href: string): boolean => (href === "/" ? pathname === "/" : pathname.startsWith(href));

	return (
		<aside className="w-60 bg-white border-r border-stone-100 flex flex-col shrink-0 shadow-sm font-murecho">
			{/* Logo */}
			<div className="px-6 py-5 flex items-center gap-2.5">
				<div className="w-8 h-8 rounded-xl bg-rose-400 flex items-center justify-center shadow-sm">
					<Sparkles size={15} color="white" strokeWidth={2} />
				</div>
				<span className="text-base font-bold text-stone-800 tracking-tight font-unbounded">Dashboard</span>
			</div>

			{/* Nav */}
			<nav className="flex-1 px-3 py-2 space-y-0.5">
				{navItems.map(({ icon: Icon, label, href }) => (
					<Link
						key={href}
						href={href}
						className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
							isActive(href)
								? "bg-rose-50 text-rose-500"
								: "text-stone-400 hover:text-stone-600 hover:bg-stone-50"
						}`}
					>
						<Icon size={16} strokeWidth={isActive(href) ? 2.5 : 1.8} />
						{label}
					</Link>
				))}
			</nav>

			{/* User */}
			<div className="px-3 pb-4">
				<div className="bg-rose-50 rounded-2xl px-4 py-3 flex items-center gap-3">
					<div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-300 to-pink-400 flex items-center justify-center text-[11px] font-bold text-white shadow-sm shrink-0">
						AK
					</div>
					<div className="min-w-0">
						<p className="text-sm font-semibold text-stone-700 truncate">springbytheday</p>
						<p className="text-xs text-stone-400">Admin</p>
					</div>
				</div>
			</div>
		</aside>
	);
}
