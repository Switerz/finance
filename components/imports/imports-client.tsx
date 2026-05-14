"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  CheckCircle2,
  FileDown,
  FileSpreadsheet,
  Upload
} from "lucide-react";
import { toast } from "sonner";
import { previewImportRows } from "@/lib/actions/imports";
import {
  importStatusLabels,
  transactionTypeLabels
} from "@/lib/constants/finance";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatDateBR } from "@/lib/formatters/date";
import { normalizeLookup } from "@/lib/imports/normalize";
import type {
  ImportCommitInput,
  ImportDefaultType,
  ImportFormOptions,
  ImportMapping,
  ImportPreviewResult,
  ImportRawRow,
  ImportRecord,
  ImportResult,
  ManualTransactionType
} from "@/types/finance";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

type ImportsClientProps = {
  imports: ImportRecord[];
  options: ImportFormOptions;
  canWrite: boolean;
  currency: string;
};

const defaultTypeOptions = [
  ["auto", "Inferir pelo valor"],
  ["income", transactionTypeLabels.income],
  ["expense", transactionTypeLabels.expense],
  ["investment", transactionTypeLabels.investment]
] as [ImportDefaultType, string][];

const importTypes = ["income", "expense", "investment"] as const;

function firstCategoryByType(
  categories: ImportFormOptions["categories"],
  type: ManualTransactionType
) {
  return categories.find((category) => category.type === type)?.id;
}

function buildInitialMapping(options: ImportFormOptions): ImportMapping {
  return {
    dateColumn: "",
    descriptionColumn: "",
    amountColumn: "",
    typeColumn: undefined,
    categoryColumn: undefined,
    accountColumn: undefined,
    defaultAccountId: options.accounts[0]?.id ?? "",
    defaultType: "auto",
    defaultCategoryByType: {
      income: firstCategoryByType(options.categories, "income"),
      expense: firstCategoryByType(options.categories, "expense"),
      investment: firstCategoryByType(options.categories, "investment")
    }
  };
}

function guessColumn(headers: string[], candidates: string[]) {
  const normalizedCandidates = candidates.map(normalizeLookup);

  return (
    headers.find((header) =>
      normalizedCandidates.some((candidate) =>
        normalizeLookup(header).includes(candidate)
      )
    ) ?? ""
  );
}

function signedPreviewAmount(row: {
  amount: number | null;
  type: ManualTransactionType | null;
}) {
  if (row.amount === null) {
    return 0;
  }

  return row.type === "income" ? row.amount : -row.amount;
}

function statusVariant(status: ImportRecord["status"]) {
  if (status === "processed") {
    return "secondary" as const;
  }

  if (status === "failed") {
    return "destructive" as const;
  }

  return "outline" as const;
}

function mapSelectValue(value: string | undefined) {
  return value ?? "none";
}

function fromSelectValue(value: string) {
  return value === "none" ? undefined : value;
}

export function ImportsClient({
  imports,
  options,
  canWrite,
  currency
}: ImportsClientProps) {
  const router = useRouter();
  const [fileName, setFileName] = React.useState("");
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<ImportRawRow[]>([]);
  const [mapping, setMapping] = React.useState<ImportMapping>(() =>
    buildInitialMapping(options)
  );
  const [preview, setPreview] = React.useState<ImportPreviewResult | null>(null);
  const [selectedRows, setSelectedRows] = React.useState<Set<number>>(new Set());
  const [isParsing, setIsParsing] = React.useState(false);
  const [isPreviewing, startPreviewTransition] = React.useTransition();
  const [isImporting, startImportTransition] = React.useTransition();
  const canStart =
    canWrite && options.accounts.length > 0 && options.categories.length > 0;
  const selectedCount = selectedRows.size;

  function updateMapping(partial: Partial<ImportMapping>) {
    setMapping((current) => ({ ...current, ...partial }));
    setPreview(null);
    setSelectedRows(new Set());
  }

  function updateDefaultCategory(type: ManualTransactionType, categoryId: string) {
    setMapping((current) => ({
      ...current,
      defaultCategoryByType: {
        ...current.defaultCategoryByType,
        [type]: categoryId
      }
    }));
    setPreview(null);
    setSelectedRows(new Set());
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsParsing(true);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setIsParsing(false);
        const parsedHeaders = (result.meta.fields ?? []).filter(Boolean);
        const parsedRows = result.data
          .filter((row) =>
            Object.values(row).some((value) => String(value ?? "").trim())
          )
          .slice(0, 1000);

        if (!parsedHeaders.length || !parsedRows.length) {
          toast.error("O CSV precisa ter cabeçalho e pelo menos uma linha.");
          return;
        }

        if (result.data.length > 1000) {
          toast.warning("Apenas as primeiras 1.000 linhas foram carregadas.");
        }

        setFileName(file.name);
        setHeaders(parsedHeaders);
        setRows(parsedRows);
        setPreview(null);
        setSelectedRows(new Set());
        setMapping((current) => ({
          ...current,
          dateColumn: guessColumn(parsedHeaders, ["data", "date"]),
          descriptionColumn: guessColumn(parsedHeaders, [
            "descricao",
            "descrição",
            "description",
            "historico",
            "histórico"
          ]),
          amountColumn: guessColumn(parsedHeaders, [
            "valor",
            "amount",
            "quantia"
          ]),
          typeColumn: guessColumn(parsedHeaders, ["tipo", "type"]) || undefined,
          categoryColumn:
            guessColumn(parsedHeaders, ["categoria", "category"]) || undefined,
          accountColumn:
            guessColumn(parsedHeaders, ["conta", "account"]) || undefined
        }));
      },
      error: () => {
        setIsParsing(false);
        toast.error("Não foi possível ler o CSV.");
      }
    });
  }

  function handlePreview() {
    if (!rows.length) {
      toast.error("Selecione um CSV antes de validar.");
      return;
    }

    startPreviewTransition(async () => {
      const result = await previewImportRows({
        fileName: fileName || "import.csv",
        rows,
        mapping
      });

      if (!result.ok) {
        toast.error(result.message ?? "Não foi possível validar o CSV.");
        setPreview(result);
        return;
      }

      setPreview(result);
      setSelectedRows(
        new Set(
          result.rows
            .filter((row) => row.errors.length === 0)
            .map((row) => row.rowNumber)
        )
      );
      toast.success("Preview validado.");
    });
  }

  function handleImport() {
    if (!selectedRows.size) {
      toast.error("Selecione pelo menos uma linha válida.");
      return;
    }

    const payload: ImportCommitInput = {
      fileName: fileName || "import.csv",
      rows,
      mapping,
      selectedRowNumbers: [...selectedRows]
    };

    startImportTransition(async () => {
      const response = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as ImportResult;

      if (!result.ok) {
        toast.error(result.message ?? "Não foi possível importar.");
        return;
      }

      toast.success(result.message ?? "Importação concluída.");
      setPreview(null);
      setRows([]);
      setHeaders([]);
      setFileName("");
      setSelectedRows(new Set());
      router.refresh();
    });
  }

  function toggleRow(rowNumber: number) {
    setSelectedRows((current) => {
      const next = new Set(current);

      if (next.has(rowNumber)) {
        next.delete(rowNumber);
      } else {
        next.add(rowNumber);
      }

      return next;
    });
  }

  function toggleAllValid() {
    if (!preview) {
      return;
    }

    const validRows = preview.rows
      .filter((row) => row.errors.length === 0)
      .map((row) => row.rowNumber);
    const allSelected = validRows.every((rowNumber) => selectedRows.has(rowNumber));

    setSelectedRows(allSelected ? new Set() : new Set(validRows));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importação CSV"
        description="Traga extratos para o workspace com preview, validação e confirmação antes de gravar."
      />

      {!canWrite ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Seu papel neste workspace permite apenas visualização.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Arquivo e mapeamento</CardTitle>
            <CardDescription>
              Mapeie as colunas obrigatórias e escolha os padrões usados quando o CSV não trouxer conta ou categoria.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="csv-file">Arquivo CSV</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                disabled={!canStart || isParsing || isPreviewing || isImporting}
                onChange={handleFileChange}
              />
              {fileName ? (
                <p className="text-xs text-muted-foreground">
                  {fileName} · {rows.length} linha(s) carregada(s)
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <ColumnSelect
                label="Data"
                value={mapping.dateColumn}
                headers={headers}
                required
                onChange={(value) => updateMapping({ dateColumn: value })}
              />
              <ColumnSelect
                label="Descrição"
                value={mapping.descriptionColumn}
                headers={headers}
                required
                onChange={(value) => updateMapping({ descriptionColumn: value })}
              />
              <ColumnSelect
                label="Valor"
                value={mapping.amountColumn}
                headers={headers}
                required
                onChange={(value) => updateMapping({ amountColumn: value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <ColumnSelect
                label="Tipo"
                value={mapping.typeColumn}
                headers={headers}
                onChange={(value) => updateMapping({ typeColumn: value })}
              />
              <ColumnSelect
                label="Categoria"
                value={mapping.categoryColumn}
                headers={headers}
                onChange={(value) => updateMapping({ categoryColumn: value })}
              />
              <ColumnSelect
                label="Conta"
                value={mapping.accountColumn}
                headers={headers}
                onChange={(value) => updateMapping({ accountColumn: value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Conta padrão</Label>
                <Select
                  value={mapping.defaultAccountId}
                  onValueChange={(value) => updateMapping({ defaultAccountId: value })}
                  disabled={!canStart}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo padrão</Label>
                <Select
                  value={mapping.defaultType}
                  onValueChange={(value) =>
                    updateMapping({ defaultType: value as ImportDefaultType })
                  }
                  disabled={!canStart}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {defaultTypeOptions.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {importTypes.map((type) => (
                <div key={type} className="space-y-2">
                  <Label>{transactionTypeLabels[type]}</Label>
                  <Select
                    value={mapping.defaultCategoryByType[type] ?? "none"}
                    onValueChange={(value) => {
                      if (value !== "none") {
                        updateDefaultCategory(type, value);
                      }
                    }}
                    disabled={!canStart}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Categoria padrão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>
                        Sem categoria ativa
                      </SelectItem>
                      {options.categories
                        .filter((category) => category.type === type)
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {!canStart ? (
              <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                Cadastre uma conta ativa e categorias ativas antes de importar.
              </p>
            ) : null}

            <Button
              type="button"
              disabled={!canStart || !rows.length || isPreviewing || isImporting}
              onClick={handlePreview}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isPreviewing ? "Validando..." : "Validar preview"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Revise avisos, desmarque linhas que não devem entrar e confirme a importação.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview ? (
              <>
                <div className="grid gap-3 sm:grid-cols-4">
                  <PreviewCounter label="Válidas" value={preview.validRows} />
                  <PreviewCounter label="Inválidas" value={preview.invalidRows} />
                  <PreviewCounter label="Duplicatas" value={preview.duplicateRows} />
                  <PreviewCounter label="Selecionadas" value={selectedCount} />
                </div>

                <div className="max-h-[460px] overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            aria-label="Selecionar linhas válidas"
                            checked={
                              preview.rows.some((row) => row.errors.length === 0) &&
                              preview.rows
                                .filter((row) => row.errors.length === 0)
                                .every((row) => selectedRows.has(row.rowNumber))
                            }
                            onChange={toggleAllValid}
                          />
                        </TableHead>
                        <TableHead>Linha</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Conta</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.rows.map((row) => {
                        const disabled = row.errors.length > 0;

                        return (
                          <TableRow key={row.rowNumber}>
                            <TableCell>
                              <input
                                type="checkbox"
                                aria-label={`Selecionar linha ${row.rowNumber}`}
                                disabled={disabled}
                                checked={selectedRows.has(row.rowNumber)}
                                onChange={() => toggleRow(row.rowNumber)}
                              />
                            </TableCell>
                            <TableCell>{row.rowNumber}</TableCell>
                            <TableCell>
                              {row.transactionDate
                                ? formatDateBR(row.transactionDate)
                                : "-"}
                            </TableCell>
                            <TableCell className="min-w-48">
                              <p className="truncate font-medium">
                                {row.description ?? "-"}
                              </p>
                              {row.warnings.length || row.errors.length ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {[...row.errors, ...row.warnings].join(" ")}
                                </p>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              {row.type ? transactionTypeLabels[row.type] : "-"}
                            </TableCell>
                            <TableCell>
                              {row.amount !== null
                                ? formatCurrency(signedPreviewAmount(row), currency)
                                : "-"}
                            </TableCell>
                            <TableCell>{row.accountName ?? "-"}</TableCell>
                            <TableCell>{row.categoryName ?? "-"}</TableCell>
                            <TableCell>
                              {row.errors.length ? (
                                <Badge variant="destructive">Erro</Badge>
                              ) : row.duplicate ? (
                                <Badge variant="outline">Aviso</Badge>
                              ) : (
                                <Badge variant="secondary">OK</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <Button
                  type="button"
                  disabled={!selectedCount || isImporting}
                  onClick={handleImport}
                  className="w-full"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {isImporting
                    ? "Importando..."
                    : `Importar ${selectedCount} linha(s)`}
                </Button>
              </>
            ) : (
              <EmptyState
                icon={FileSpreadsheet}
                title="Preview aguardando validação"
                description="Carregue um CSV, mapeie as colunas e valide antes de gravar transações."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de importações</CardTitle>
          <CardDescription>
            Arquivos já processados neste workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {imports.length ? (
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Linhas</TableHead>
                    <TableHead>Processadas</TableHead>
                    <TableHead>Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imports.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.file_name ?? "CSV sem nome"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(item.status)}>
                          {importStatusLabels[item.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.total_rows ?? 0}</TableCell>
                      <TableCell>{item.processed_rows ?? 0}</TableCell>
                      <TableCell>{formatDateBR(item.created_at.slice(0, 10))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={FileDown}
              title="Nenhum arquivo importado"
              description="Quando um CSV for confirmado, ele aparecerá aqui com o resultado do processamento."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ColumnSelect({
  label,
  value,
  headers,
  required,
  onChange
}: {
  label: string;
  value: string | undefined;
  headers: string[];
  required?: boolean;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Select
        value={required ? (value ?? "") : mapSelectValue(value)}
        onValueChange={(next) => onChange(fromSelectValue(next))}
      >
        <SelectTrigger>
          <SelectValue placeholder="Coluna" />
        </SelectTrigger>
        <SelectContent>
          {!required ? <SelectItem value="none">Não mapear</SelectItem> : null}
          {headers.map((header) => (
            <SelectItem key={header} value={header}>
              {header}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PreviewCounter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
