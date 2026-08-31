import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getSessionUser();
  redirect(user ? (user.role === "OPERATOR" ? "/transactions/new" : "/dashboard") : "/login");
}
