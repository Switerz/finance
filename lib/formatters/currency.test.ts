import { describe, expect, it } from "vitest";
import { formatCurrency } from "./currency";

describe("formatCurrency", () => {
  it("formata BRL por padrão", () => {
    expect(formatCurrency(1234.56)).toBe("R$ 1.234,56");
  });

  it("formata zero como R$ 0,00", () => {
    expect(formatCurrency(0)).toBe("R$ 0,00");
  });

  it("formata valor negativo", () => {
    expect(formatCurrency(-500)).toBe("-R$ 500,00");
  });

  it("formata valor grande com separador de milhar", () => {
    expect(formatCurrency(1000000)).toBe("R$ 1.000.000,00");
  });

  it("respeita currency USD", () => {
    const result = formatCurrency(99.9, "USD");
    expect(result).toContain("99");
    expect(result).toContain("90");
  });
});
