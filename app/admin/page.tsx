import type { Metadata } from "next";
import AdminApp from "@/components/admin/AdminApp";
import AdminLogin from "@/components/admin/AdminLogin";
import { isAdmin } from "@/lib/auth";
import "./admin.css";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authed = await isAdmin();
  return <main className="page">{authed ? <AdminApp /> : <AdminLogin />}</main>;
}
