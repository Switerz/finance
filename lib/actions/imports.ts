"use server";

import {
  buildImportPreviewForWorkspace,
  commitImportForWorkspace
} from "@/lib/imports/processor";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import { createClient } from "@/lib/supabase/server";
import type {
  ImportCommitInput,
  ImportPreviewResult,
  ImportResult
} from "@/types/finance";
import type { ImportPreviewInput } from "@/lib/validations/imports";

export async function previewImportRows(
  input: ImportPreviewInput
): Promise<ImportPreviewResult> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    return {
      ok: false,
      message: "Workspace não encontrado.",
      rows: [],
      validRows: 0,
      invalidRows: 0,
      duplicateRows: 0
    };
  }

  return buildImportPreviewForWorkspace(workspace.id, input);
}

export async function commitImport(input: ImportCommitInput): Promise<ImportResult> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    return { ok: false, message: "Workspace não encontrado." };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Autenticação necessária." };
  }

  return commitImportForWorkspace({ workspace, userId: user.id, input });
}
