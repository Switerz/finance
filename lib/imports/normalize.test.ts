import { describe, expect, it } from "vitest";
import {
  duplicateKey,
  inferImportType,
  normalizeLookup,
  parseImportAmount,
  parseImportDate,
  parseImportType,
  readCell
} from "./normalize";

describe("normalizeLookup", () => {
  it("remove acentos e converte para minúsculas", () => {
    expect(normalizeLookup("Salário")).toBe("salario");
    expect(normalizeLookup("Crédito")).toBe("credito");
    expect(normalizeLookup("Débito")).toBe("debito");
  });

  it("colapsa espaços extras", () => {
    expect(normalizeLookup("  foo   bar  ")).toBe("foo bar");
  });

  it("trata null/undefined como string vazia", () => {
    expect(normalizeLookup(null)).toBe("");
    expect(normalizeLookup(undefined)).toBe("");
  });
});

describe("readCell", () => {
  const row = { Descricao: "  Mercado  ", Valor: "100" };

  it("lê e faz trim do valor da célula", () => {
    expect(readCell(row, "Descricao")).toBe("Mercado");
  });

  it("retorna string vazia quando coluna é undefined", () => {
    expect(readCell(row, undefined)).toBe("");
  });

  it("retorna string vazia quando coluna não existe na linha", () => {
    expect(readCell(row, "ColunaNaoExiste")).toBe("");
  });
});

describe("parseImportDate", () => {
  it("aceita formato ISO yyyy-MM-dd", () => {
    expect(parseImportDate("2024-03-15")).toBe("2024-03-15");
  });

  it("aceita formato brasileiro dd/MM/yyyy", () => {
    expect(parseImportDate("15/03/2024")).toBe("2024-03-15");
  });

  it("aceita separador hífen dd-MM-yyyy", () => {
    expect(parseImportDate("15-03-2024")).toBe("2024-03-15");
  });

  it("retorna null para formato inválido", () => {
    expect(parseImportDate("99/99/9999")).toBeNull();
    expect(parseImportDate("abc")).toBeNull();
    expect(parseImportDate("")).toBeNull();
  });

  it("rejeita data impossível (fevereiro 30)", () => {
    expect(parseImportDate("2024-02-30")).toBeNull();
  });

  it("normaliza zero-padding dos campos", () => {
    expect(parseImportDate("01/01/2024")).toBe("2024-01-01");
  });
});

describe("parseImportAmount", () => {
  it("parseia número simples", () => {
    expect(parseImportAmount("100")).toBe(100);
  });

  it("parseia com decimal em vírgula (pt-BR)", () => {
    expect(parseImportAmount("1.234,56")).toBe(1234.56);
  });

  it("parseia com decimal em ponto (en-US)", () => {
    expect(parseImportAmount("1234.56")).toBe(1234.56);
  });

  it("remove prefixo R$", () => {
    expect(parseImportAmount("R$ 150,00")).toBe(150);
    expect(parseImportAmount("r$150,00")).toBe(150);
  });

  it("parseia valor negativo", () => {
    expect(parseImportAmount("-250,50")).toBe(-250.5);
  });

  it("retorna null para string inválida", () => {
    expect(parseImportAmount("")).toBeNull();
    expect(parseImportAmount("abc")).toBeNull();
  });
});

describe("parseImportType", () => {
  it.each([
    ["income", "income"],
    ["receita", "income"],
    ["entrada", "income"],
    ["credito", "income"],
    ["Crédito", "income"],
    ["expense", "expense"],
    ["despesa", "expense"],
    ["saida", "expense"],
    ["Saída", "expense"],
    ["debito", "expense"],
    ["Débito", "expense"],
    ["investment", "investment"],
    ["investimento", "investment"],
    ["Aplicação", "investment"],
    ["aporte", "investment"]
  ])('parseia "%s" como %s', (input, expected) => {
    expect(parseImportType(input)).toBe(expected);
  });

  it("retorna null para valor desconhecido", () => {
    expect(parseImportType("transferencia")).toBeNull();
    expect(parseImportType("")).toBeNull();
  });
});

describe("inferImportType", () => {
  it("usa tipo mapeado quando reconhecido", () => {
    expect(inferImportType(100, "receita", "auto")).toBe("income");
    expect(inferImportType(-100, "despesa", "auto")).toBe("expense");
  });

  it("usa defaultType quando tipo não reconhecido", () => {
    expect(inferImportType(100, "desconhecido", "expense")).toBe("expense");
  });

  it("infere pelo sinal quando auto e tipo desconhecido", () => {
    expect(inferImportType(-50, "desconhecido", "auto")).toBe("expense");
    expect(inferImportType(50, "desconhecido", "auto")).toBe("income");
  });
});

describe("duplicateKey", () => {
  const base = {
    transactionDate: "2024-01-15",
    description: "Mercado Extra",
    amount: 150.5,
    type: "expense" as const,
    accountId: "acc-123"
  };

  it("gera chave determinística", () => {
    expect(duplicateKey(base)).toBe(duplicateKey(base));
  });

  it("gera chave diferente para datas distintas", () => {
    const other = { ...base, transactionDate: "2024-01-16" };
    expect(duplicateKey(base)).not.toBe(duplicateKey(other));
  });

  it("normaliza descrição para evitar falsos negativos", () => {
    const withAccent = { ...base, description: "Mercádo Éxtra" };
    expect(duplicateKey(base)).toBe(duplicateKey(withAccent));
  });

  it("usa valor absoluto do amount em centavos", () => {
    const positive = { ...base, amount: 150.5 };
    const negative = { ...base, amount: -150.5 };
    expect(duplicateKey(positive)).toBe(duplicateKey(negative));
  });
});
