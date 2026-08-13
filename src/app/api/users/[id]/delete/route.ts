import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/queries";
import { redirectTo } from "@/lib/redirect";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteProps) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return redirectTo(request, "/login?error=expired");
  }

  const { id } = await params;
  if (id === user.userId) {
    return redirectTo(request, "/users?error=self-delete");
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return redirectTo(request, "/users?error=notfound");
  }

  if (target.companyId !== user.companyId) {
    return redirectTo(request, "/users?error=notfound");
  }

  try {
    await prisma.user.delete({ where: { id } });

    await createAuditLog({
      companyId: user.companyId,
      userId: user.userId,
      action: "DELETE",
      entityType: "USER",
      entityId: id,
      description: `Eliminato utente ${target.username}`
    });

    return redirectTo(request, "/users?success=deleted");
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return redirectTo(request, "/users?error=has-dependencies");
    }

    console.error("Errore eliminazione utente", error);
    return redirectTo(request, "/users?error=invalid");
  }
}
