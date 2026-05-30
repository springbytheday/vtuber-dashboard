"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart3, Users, ShoppingCart, Settings, Package, Zap, LucideIcon } from "lucide-react";

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
		<aside className="w-56 border-r border-[#1e1e26] flex flex-col shrink-0">
			{/* Logo */}
			<div className="px-5 py-5 border-b border-[#1e1e26] flex items-center gap-2">
				<div className="w-6 h-6 bg-[#e8ff47] flex items-center justify-center">
					<Zap size={14} color="#0e0e12" strokeWidth={3} />
				</div>
				<span className="text-sm font-bold tracking-widest text-white uppercase">Voltr</span>
			</div>

			{/* Nav */}
			<nav className="flex-1 py-4 px-3 space-y-0.5">
				{navItems.map(({ icon: Icon, label, href }) => (
					<Link
						key={href}
						href={href}
						className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs tracking-wider uppercase transition-all duration-150 ${
							isActive(href)
								? "bg-[#e8ff47]/10 text-[#e8ff47] border-l-2 border-[#e8ff47]"
								: "text-[#666] hover:text-[#aaa] hover:bg-white/5 border-l-2 border-transparent"
						}`}
					>
						<Icon size={14} strokeWidth={1.5} />
						{label}
					</Link>
				))}
			</nav>

			{/* User */}
			<div className="px-4 py-4 border-t border-[#1e1e26] flex items-center gap-3">
				<div className="w-7 h-7 rounded-full bg-linear-to-br from-violet-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white">
					AK
				</div>
				<div>
					<p className="text-[11px] text-white">Springbytheday</p>
					<p className="text-[10px] text-[#555]">Admin</p>
				</div>
			</div>
		</aside>
	);
}
