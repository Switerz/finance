import { describe, expect, it } from "vitest";
import { formatDateBR, formatMonthBR } from "./date";

describe("formatDateBR", () => {
  it("formata ISO string como dd/MM/yyyy", () => {
    expect(formatDateBR("2024-03-15")).toBe("15/03/2024");
  });

  it("formata objeto Date", () => {
    expect(formatDateBR(new Date(2024, 0, 1))).toBe("01/01/2024");
  });

  it("formata último dia do ano", () => {
    expect(formatDateBR("2023-12-31")).toBe("31/12/2023");
  });
});

describe("formatMonthBR", () => {
  it("formata mês por extenso em português", () => {
    const result = formatMonthBR("2024-01-01");
    expect(result.toLowerCase()).toContain("janeiro");
    expect(result).toContain("2024");
  });

  it("formata dezembro corretamente", () => {
    const result = formatMonthBR("2024-12-01");
    expect(result.toLowerCase()).toContain("dezembro");
  });
});
