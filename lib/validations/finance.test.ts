import { describe, expect, it } from "vitest";
import {
  accountFormSchema,
  budgetFormSchema,
  goalFormSchema,
  transactionFormSchema
} from "./finance";

const validUuid = "00000000-0000-0000-0000-000000000001";

describe("accountFormSchema", () => {
  it("valida conta corrente simples", () => {
    const result = accountFormSchema.safeParse({
      name: "Conta Nubank",
      type: "checking",
      initialBalance: "0",
      isActive: true
    });
    expect(result.success).toBe(true);
  });

  it("rejeita nome muito curto", () => {
    const result = accountFormSchema.safeParse({
      name: "A",
      type: "checking"
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("name");
  });

  it("rejeita tipo inválido", () => {
    const result = accountFormSchema.safeParse({
      name: "Minha conta",
      type: "invalid_type"
    });
    expect(result.success).toBe(false);
  });

  it("exige closingDay e dueDay para cartão de crédito", () => {
    const result = accountFormSchema.safeParse({
      name: "Cartão Nubank",
      type: "credit_card",
      initialBalance: "0"
    });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path[0]);
    expect(paths).toContain("closingDay");
    expect(paths).toContain("dueDay");
  });

  it("aceita cartão de crédito com todos os campos", () => {
    const result = accountFormSchema.safeParse({
      name: "Cartão Nubank",
      type: "credit_card",
      initialBalance: "0",
      creditLimit: "5000",
      closingDay: "15",
      dueDay: "22"
    });
    expect(result.success).toBe(true);
  });

  it("rejeita creditLimit negativo no cartão", () => {
    const result = accountFormSchema.safeParse({
      name: "Cartão",
      type: "credit_card",
      initialBalance: "0",
      creditLimit: "-100",
      closingDay: "10",
      dueDay: "15"
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("creditLimit");
  });
});

describe("transactionFormSchema", () => {
  const validTransaction = {
    description: "Supermercado",
    amount: "150.00",
    type: "expense",
    transactionDate: "2024-01-15",
    accountId: validUuid,
    categoryId: validUuid,
    status: "paid"
  };

  it("valida transação completa", () => {
    const result = transactionFormSchema.safeParse(validTransaction);
    expect(result.success).toBe(true);
  });

  it("rejeita amount zero", () => {
    const result = transactionFormSchema.safeParse({
      ...validTransaction,
      amount: "0"
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("amount");
  });

  it("rejeita amount negativo", () => {
    const result = transactionFormSchema.safeParse({
      ...validTransaction,
      amount: "-50"
    });
    expect(result.success).toBe(false);
  });

  it("rejeita data em formato inválido", () => {
    const result = transactionFormSchema.safeParse({
      ...validTransaction,
      transactionDate: "15/01/2024"
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("transactionDate");
  });

  it("rejeita accountId inválido (não UUID)", () => {
    const result = transactionFormSchema.safeParse({
      ...validTransaction,
      accountId: "nao-e-uuid"
    });
    expect(result.success).toBe(false);
  });

  it("aceita vírgula como separador decimal (sem separador de milhar)", () => {
    const result = transactionFormSchema.safeParse({
      ...validTransaction,
      amount: "150,99"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(150.99);
    }
  });

  it("rejeita descrição muito curta", () => {
    const result = transactionFormSchema.safeParse({
      ...validTransaction,
      description: "A"
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("description");
  });

  it("tags como string separada por vírgula são parseadas", () => {
    const result = transactionFormSchema.safeParse({
      ...validTransaction,
      tags: "alimentacao,casa,mensal"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual(["alimentacao", "casa", "mensal"]);
    }
  });
});

describe("budgetFormSchema", () => {
  it("valida orçamento simples", () => {
    const result = budgetFormSchema.safeParse({
      categoryId: validUuid,
      month: "2024-01-01",
      plannedAmount: "1000",
      alertThreshold: "90"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.alertThreshold).toBe(0.9);
    }
  });

  it("aceita alertThreshold como decimal entre 0 e 1", () => {
    const result = budgetFormSchema.safeParse({
      categoryId: validUuid,
      month: "2024-01-01",
      plannedAmount: "500",
      alertThreshold: "0.8"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.alertThreshold).toBe(0.8);
    }
  });

  it("rejeita mês no formato errado", () => {
    const result = budgetFormSchema.safeParse({
      categoryId: validUuid,
      month: "2024-01",
      plannedAmount: "500",
      alertThreshold: "90"
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("month");
  });

  it("rejeita plannedAmount zero", () => {
    const result = budgetFormSchema.safeParse({
      categoryId: validUuid,
      month: "2024-01-01",
      plannedAmount: "0",
      alertThreshold: "90"
    });
    expect(result.success).toBe(false);
  });
});

describe("goalFormSchema", () => {
  it("valida meta simples", () => {
    const result = goalFormSchema.safeParse({
      name: "Reserva de emergência",
      targetAmount: "30000",
      currentAmount: "5000",
      status: "active"
    });
    expect(result.success).toBe(true);
  });

  it("rejeita currentAmount maior que targetAmount", () => {
    const result = goalFormSchema.safeParse({
      name: "Meta impossível",
      targetAmount: "1000",
      currentAmount: "2000",
      status: "active"
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("currentAmount");
  });

  it("rejeita targetAmount zero", () => {
    const result = goalFormSchema.safeParse({
      name: "Meta vazia",
      targetAmount: "0",
      currentAmount: "0",
      status: "active"
    });
    expect(result.success).toBe(false);
  });

  it("aceita meta sem deadline", () => {
    const result = goalFormSchema.safeParse({
      name: "Aposentadoria",
      targetAmount: "1000000",
      currentAmount: "0",
      status: "active"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deadline).toBeUndefined();
    }
  });

  it("aceita deadline em formato ISO válido", () => {
    const result = goalFormSchema.safeParse({
      name: "Viagem",
      targetAmount: "5000",
      currentAmount: "0",
      deadline: "2025-12-01",
      status: "active"
    });
    expect(result.success).toBe(true);
  });
});
