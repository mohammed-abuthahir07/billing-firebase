"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const formatters_1 = require("./formatters");
(0, vitest_1.describe)('formatters', () => {
    (0, vitest_1.it)('should accurately round currency to two decimal places', () => {
        (0, vitest_1.expect)((0, formatters_1.roundCurrency)(175.004)).toBe(175.0);
        (0, vitest_1.expect)((0, formatters_1.roundCurrency)(175.006)).toBe(175.01);
        (0, vitest_1.expect)((0, formatters_1.roundCurrency)(3.5)).toBe(3.5);
    });
    (0, vitest_1.it)('should format variant labels correctly', () => {
        (0, vitest_1.expect)((0, formatters_1.formatVariantLabel)('idli podi', 250, 'g')).toBe('idli podi 250g');
        (0, vitest_1.expect)((0, formatters_1.formatVariantLabel)('tea powder', '1.5', 'kg')).toBe('tea powder 1.5kg');
    });
});
//# sourceMappingURL=formatters.test.js.map