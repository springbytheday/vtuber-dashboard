import type { Metadata } from "next";
import { Unbounded, Murecho } from "next/font/google";
import Sidebar from "./components/sidebar";
import "./globals.css";

// Unbounded — used for headings and the logo wordmark
const unbounded = Unbounded({
	subsets: ["latin"],
	weight: ["400", "600", "700"],
	variable: "--font-unbounded",
	display: "swap",
});

// Murecho — used for body text, labels, nav items
const murecho = Murecho({
	subsets: ["latin"],
	weight: ["400", "500", "600"],
	variable: "--font-murecho",
	display: "swap",
});

export const metadata: Metadata = {
	title: "Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={`${unbounded.variable} ${murecho.variable}`}>
			<body className="font-murecho">
				<div className="flex h-screen bg-[#faf9f6] text-stone-700 overflow-hidden">
					<Sidebar />
					<div className="flex-1 flex flex-col overflow-hidden">{children}</div>
				</div>
			</body>
		</html>
	);
}
