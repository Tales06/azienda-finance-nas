import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/queries";
import { categorySchema } from "@/lib/validation";
import { redirectTo } from "@/lib/redirect";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["ADMIN", "MANAGER"].includes(user.role)) {
    return redirectTo(request, "/login?error=expired");
  }

  const formData = await request.formData();
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    color: formData.get("color")
  });

  if (!parsed.success) {
    return redirectTo(request, "/categories?error=invalid");
  }

  const category = await prisma.category.create({
    data: {
      companyId: user.companyId,
      name: parsed.data.name,
      type: parsed.data.type,
      color: parsed.data.color,
      isActive: true
    }
  });

  await createAuditLog({
    companyId: user.companyId,
    userId: user.userId,
    action: "CREATE",
    entityType: "CATEGORY",
    entityId: category.id,
    description: `Creata categoria ${category.name}`
  });

  return redirectTo(request, "/categories?success=created");
}
