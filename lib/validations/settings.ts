import { z } from "zod";

export const profileSettingsSchema = z.object({
  fullName: z.string().trim().max(120, "Use até 120 caracteres.").optional(),
  avatarUrl: z
    .string()
    .trim()
    .max(500, "Use até 500 caracteres.")
    .optional()
    .transform((value) => (value === "" ? undefined : value))
    .refine(
      (value) => !value || /^https?:\/\//.test(value),
      "Informe uma URL começando com http:// ou https://."
    )
});

export const workspaceSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe um nome com pelo menos 2 caracteres.")
    .max(100, "Use até 100 caracteres."),
  currency: z
    .string()
    .trim()
    .min(3, "Informe uma moeda válida.")
    .max(3, "Use o código ISO de 3 letras.")
    .transform((value) => value.toUpperCase())
});

export const workspaceMemberRoleSchema = z.enum(["admin", "member", "viewer"]);

export const addWorkspaceMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Informe um email válido.")
    .transform((value) => value.toLowerCase()),
  role: workspaceMemberRoleSchema.default("viewer")
});

export const deleteWorkspaceSchema = z.object({
  confirmationName: z.string().trim().min(1, "Digite o nome do workspace.")
});

export type ProfileSettingsInput = z.input<typeof profileSettingsSchema>;
export type WorkspaceSettingsInput = z.input<typeof workspaceSettingsSchema>;
export type AddWorkspaceMemberInput = z.input<typeof addWorkspaceMemberSchema>;
export type WorkspaceMemberRoleInput = z.input<typeof workspaceMemberRoleSchema>;
export type DeleteWorkspaceInput = z.input<typeof deleteWorkspaceSchema>;
