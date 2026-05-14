export function splitAmountIntoInstallments(totalAmount: number, installmentTotal: number) {
  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / installmentTotal);
  const remainderCents = totalCents - baseCents * installmentTotal;

  return Array.from({ length: installmentTotal }, (_, index) => {
    const cents =
      index === installmentTotal - 1 ? baseCents + remainderCents : baseCents;

    return cents / 100;
  });
}
