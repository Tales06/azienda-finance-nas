import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { hashPassword } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/queries";
import { userSchema } from "@/lib/validation";
import { redirectTo } from "@/lib/redirect";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return redirectTo(request, "/login?error=expired");
  }

  const formData = await request.formData();
  const parsed = userSchema.safeParse({
    username: formData.get("username"),
    displayName: formData.get("displayName"),
    password: formData.get("password"),
    role: formData.get("role")
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => issue.message)
      .join(" • ");
    const params = new URLSearchParams({ error: "invalid" });
    if (details) {
      params.set("details", details);
    }
    return redirectTo(request, `/users?${params.toString()}`);
  }

  const normalizedUsername = parsed.data.username.toLowerCase();

  try {
    const created = await prisma.user.create({
      data: {
        companyId: user.companyId,
        username: normalizedUsername,
        displayName: parsed.data.displayName,
        passwordHash: hashPassword(parsed.data.password),
        role: parsed.data.role,
        isActive: true
      }
    });

    await createAuditLog({
      companyId: user.companyId,
      userId: user.userId,
      action: "CREATE",
      entityType: "USER",
      entityId: created.id,
      description: `Creato utente ${created.username}`
    });

    return redirectTo(request, "/users?success=created");
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return redirectTo(request, "/users?error=duplicate");
    }

    console.error("Errore creazione utente", error);
    return redirectTo(request, "/users?error=invalid");
  }
}
