"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roundCurrency = roundCurrency;
exports.formatVariantLabel = formatVariantLabel;
function roundCurrency(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}
function formatVariantLabel(itemName, packageWeight, weightUnit) {
    const formattedWeight = parseFloat(String(packageWeight)) % 1 === 0
        ? String(parseInt(String(packageWeight), 10))
        : String(packageWeight);
    return `${itemName.trim()} ${formattedWeight}${weightUnit.trim()}`;
}
//# sourceMappingURL=formatters.js.map