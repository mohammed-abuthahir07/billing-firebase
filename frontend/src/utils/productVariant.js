export const formatVariantLabel = (itemName, packageWeight, weightUnit) => {
  const name = (itemName || "").trim();
  const weight = Number(packageWeight);
  const unit = String(weightUnit || "").trim();

  if (!name) return "";
  if (!weight || Number.isNaN(weight) || !unit) return name;

  const weightLabel = Number.isInteger(weight)
    ? String(weight)
    : String(weight).replace(/\.?0+$/, "");

  const unitLabel = unit.length <= 2 ? unit : ` ${unit}`;
  return `${name} ${weightLabel}${unitLabel}`.replace(/\s+/g, " ").trim();
};

export const formatPackLabel = (packageWeight, weightUnit) => {
  const weight = Number(packageWeight);
  const unit = String(weightUnit || "").trim();
  if (!Number.isFinite(weight) || weight <= 0 || !unit) return "—";
  const weightLabel = Number.isInteger(weight) ? String(weight) : String(weight);
  return unit.length <= 2 ? `${weightLabel}${unit}` : `${weightLabel} ${unit}`;
};

export const getProductName = (product = {}) =>
  product.itemName || product.name || product.item_name || "";

export const getVariantLabel = (product = {}) =>
  formatVariantLabel(
    getProductName(product),
    product.package_weight ?? product.packageWeight,
    product.weight_unit || product.weightUnit
  );
