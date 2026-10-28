export function roundCurrency(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function formatVariantLabel(itemName: string, packageWeight: number | string, weightUnit: string): string {
  const formattedWeight = parseFloat(String(packageWeight)) % 1 === 0
    ? String(parseInt(String(packageWeight), 10))
    : String(packageWeight);
  return `${itemName.trim()} ${formattedWeight}${weightUnit.trim()}`;
}
