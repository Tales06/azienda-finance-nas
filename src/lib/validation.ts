import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username obbligatorio"),
  password: z.string().min(1, "Password obbligatoria")
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Nome obbligatorio").max(80),
  type: z.enum(["INCOME", "EXPENSE", "BOTH"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/)
});

export const userSchema = z.object({
  username: z
    .string({ error: "Username obbligatorio" })
    .trim()
    .min(3, "Username: deve avere almeno 3 caratteri")
    .max(40, "Username: può contenere massimo 40 caratteri")
    .regex(/^[a-zA-Z0-9._-]+$/, "Username: può contenere solo lettere, numeri, punti, trattini e underscore"),
  displayName: z
    .string({ error: "Nome visualizzato obbligatorio" })
    .trim()
    .min(2, "Nome visualizzato: è obbligatorio")
    .max(80, "Nome visualizzato: può contenere massimo 80 caratteri"),
  password: z
    .string({ error: "Password obbligatoria" })
    .min(8, "Password iniziale: deve avere almeno 8 caratteri")
    .max(120, "Password iniziale: può contenere massimo 120 caratteri"),
  role: z.enum(["ADMIN", "MANAGER", "OPERATOR", "VIEWER"], {
    message: "Ruolo: seleziona un valore valido"
  })
});

export const companySchema = z.object({
  name: z.string().trim().min(2).max(120),
  baseCurrency: z.string().trim().length(3).transform((value) => value.toUpperCase())
});

export const exchangeRateSchema = z.object({
  quoteCurrency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  rate: z.coerce.number().positive(),
  effectiveDate: z.string().min(1)
});
