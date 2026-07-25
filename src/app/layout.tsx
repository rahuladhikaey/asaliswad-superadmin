import { Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeSync } from "@/components/ThemeSync";

const outfit = Outfit({
	subsets: ["latin"],
	variable: "--font-outfit",
	display: "swap",
});
const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});
export const metadata = {
	title: "Super Admin Panel - Asali Swad",
	description: "Management Dashboard for Asali Swad Spices & Groceries",
};
export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			suppressHydrationWarning
			className={`${geistMono.variable} ${outfit.variable} h-full antialiased light`}
		>
			<body className="min-h-full font-sans overflow-x-hidden bg-slate-50 text-slate-900">
				<ThemeSync />
				{children}
			</body>
		</html>
	);
}
