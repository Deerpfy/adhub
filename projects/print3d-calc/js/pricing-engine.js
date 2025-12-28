/**
 * Pricing Engine Module
 * Calculates 3D printing costs based on the formula from analysis:
 * TOTAL = (MATERIAL + ELECTRICITY + DEPRECIATION + MAINTENANCE + LABOR) × (1 + MARKUP) × RISK × URGENCY
 */

const PricingEngine = {
    // Currency symbols
    currencySymbols: {
        CZK: 'Kc',
        EUR: '€',
        USD: '$',
        PLN: 'zl'
    },

    // Currency conversion rates (relative to CZK)
    conversionRates: {
        CZK: 1,
        EUR: 0.04,      // 1 CZK ≈ 0.04 EUR
        USD: 0.044,     // 1 CZK ≈ 0.044 USD
        PLN: 0.17       // 1 CZK ≈ 0.17 PLN
    },

    /**
     * Calculate all costs
     * @param {Object} params - Calculation parameters
     * @returns {Object} - Breakdown and totals
     */
    async calculate(params) {
        const {
            volume,           // cm³
            weight,           // g
            printTimeHours,   // hours
            laborTimeHours,   // hours
            quantity,         // number of pieces
            material,         // material object { pricePerKg, density }
            printer,          // printer object { power, cost, lifetime }
            urgencyFactor,    // 1, 1.25, or 1.5
            infillPercent     // 5-100%
        } = params;

        // Get settings from DB
        const settings = await DB.getSettings();

        const electricityPrice = settings.electricityPrice || 7;
        const laborRate = settings.laborRate || 300;
        const maintenanceRate = settings.maintenanceRate || 2;
        const failureRate = (settings.failureRate || 5) / 100;
        const markupRate = (settings.markupRate || 30) / 100;
        const currency = settings.currency || 'CZK';

        // ========== Calculate individual costs ==========

        // 1. Material cost
        // Adjust weight for infill (simplified)
        const effectiveWeight = weight * (0.3 + 0.7 * (infillPercent / 100));
        const pricePerGram = material.pricePerKg / 1000;
        const materialCost = effectiveWeight * pricePerGram;

        // 2. Electricity cost
        // E = (Power_W / 1000) × Time_h × Price_per_kWh
        const printerPower = printer.power || 120;
        const electricityCost = (printerPower / 1000) * printTimeHours * electricityPrice;

        // 3. Depreciation cost
        // D = (Printer_cost / Lifetime_hours) × Print_time
        const printerCost = printer.cost || 20000;
        const printerLifetime = printer.lifetime || 5000;
        const depreciationCost = (printerCost / printerLifetime) * printTimeHours;

        // 4. Maintenance cost
        // M = Maintenance_rate × Print_time
        const maintenanceCost = maintenanceRate * printTimeHours;

        // 5. Labor cost
        // L = Labor_rate × Labor_time
        const laborCost = laborRate * laborTimeHours;

        // ========== Calculate base cost ==========
        const baseCost = materialCost + electricityCost + depreciationCost + maintenanceCost + laborCost;

        // ========== Apply adjustments ==========

        // 6. Risk adjustment (failure rate)
        // Adjusted = Base / (1 - failure_rate)
        const riskAdjustedCost = baseCost / (1 - failureRate);
        const riskCost = riskAdjustedCost - baseCost;

        // 7. Markup/Profit
        // Final = Adjusted × (1 + markup)
        const costWithMarkup = riskAdjustedCost * (1 + markupRate);
        const profitCost = costWithMarkup - riskAdjustedCost;

        // 8. Urgency factor
        // Final = Final × urgency
        const finalPricePerPiece = costWithMarkup * urgencyFactor;
        const urgencyCost = finalPricePerPiece - costWithMarkup;

        // 9. Total for quantity
        const totalPrice = finalPricePerPiece * quantity;

        // ========== Format result ==========
        const breakdown = {
            material: this.round(materialCost),
            electricity: this.round(electricityCost),
            depreciation: this.round(depreciationCost),
            maintenance: this.round(maintenanceCost),
            labor: this.round(laborCost),
            baseCost: this.round(baseCost),
            risk: this.round(riskCost),
            profit: this.round(profitCost),
            urgency: this.round(urgencyCost)
        };

        const result = {
            breakdown,
            pricePerPiece: this.round(finalPricePerPiece),
            quantity,
            totalPrice: this.round(totalPrice),
            currency,
            currencySymbol: this.currencySymbols[currency] || currency,

            // Formatted strings
            formatted: {
                pricePerPiece: this.formatPrice(finalPricePerPiece, currency),
                totalPrice: this.formatPrice(totalPrice, currency),
                breakdown: this.formatBreakdown(breakdown, currency)
            },

            // Input summary
            inputs: {
                volume,
                weight: effectiveWeight,
                printTimeHours,
                laborTimeHours,
                quantity,
                infillPercent,
                urgencyFactor,
                materialName: material.name,
                printerName: printer.name
            }
        };

        return result;
    },

    /**
     * Round to 2 decimal places
     */
    round(value) {
        return Math.round(value * 100) / 100;
    },

    /**
     * Format price with currency
     */
    formatPrice(value, currency = 'CZK') {
        const symbol = this.currencySymbols[currency] || currency;
        const rounded = this.round(value);

        if (currency === 'CZK' || currency === 'PLN') {
            return `${rounded.toLocaleString('cs-CZ')} ${symbol}`;
        } else {
            return `${symbol}${rounded.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        }
    },

    /**
     * Format breakdown for display
     */
    formatBreakdown(breakdown, currency) {
        const formatted = {};
        for (const [key, value] of Object.entries(breakdown)) {
            formatted[key] = this.formatPrice(value, currency);
        }
        return formatted;
    },

    /**
     * Convert price to different currency
     */
    convertCurrency(value, fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) return value;

        // Convert to CZK first
        const inCZK = value / this.conversionRates[fromCurrency];

        // Then to target currency
        return inCZK * this.conversionRates[toCurrency];
    },

    /**
     * Quick estimate without full calculation
     */
    quickEstimate(volumeCm3, materialPricePerKg = 500, density = 1.24, infill = 20) {
        // Simplified calculation
        const effectiveWeight = volumeCm3 * density * (0.3 + 0.7 * (infill / 100));
        const materialCost = effectiveWeight * (materialPricePerKg / 1000);

        // Rough overhead multiplier (electricity + depreciation + labor + markup)
        const overheadMultiplier = 2.5;

        return this.round(materialCost * overheadMultiplier);
    },

    /**
     * Calculate volume discount
     */
    calculateVolumeDiscount(quantity, pricePerPiece) {
        let discount = 0;

        if (quantity >= 100) {
            discount = 0.15; // 15% discount
        } else if (quantity >= 50) {
            discount = 0.10; // 10% discount
        } else if (quantity >= 10) {
            discount = 0.05; // 5% discount
        }

        const discountedPrice = pricePerPiece * (1 - discount);
        const totalSavings = (pricePerPiece - discountedPrice) * quantity;

        return {
            discountPercent: discount * 100,
            discountedPricePerPiece: this.round(discountedPrice),
            totalSavings: this.round(totalSavings)
        };
    },

    /**
     * Generate quote summary for export/copy
     */
    generateQuoteSummary(result) {
        const { breakdown, inputs, formatted } = result;

        let summary = `=== 3D Print Quote ===\n\n`;
        summary += `Model: ${inputs.materialName}\n`;
        summary += `Volume: ${inputs.volume.toFixed(2)} cm³\n`;
        summary += `Weight: ${inputs.weight.toFixed(1)} g\n`;
        summary += `Infill: ${inputs.infillPercent}%\n`;
        summary += `Print time: ${inputs.printTimeHours.toFixed(1)} hours\n`;
        summary += `Quantity: ${inputs.quantity} pcs\n\n`;

        summary += `--- Cost Breakdown ---\n`;
        summary += `Material: ${formatted.breakdown.material}\n`;
        summary += `Electricity: ${formatted.breakdown.electricity}\n`;
        summary += `Depreciation: ${formatted.breakdown.depreciation}\n`;
        summary += `Maintenance: ${formatted.breakdown.maintenance}\n`;
        summary += `Labor: ${formatted.breakdown.labor}\n`;
        summary += `Risk adjustment: ${formatted.breakdown.risk}\n`;
        summary += `Profit margin: ${formatted.breakdown.profit}\n\n`;

        summary += `--- Total ---\n`;
        summary += `Price per piece: ${formatted.pricePerPiece}\n`;
        summary += `Total (${inputs.quantity} pcs): ${formatted.totalPrice}\n`;

        return summary;
    },

    /**
     * Generate HTML quote for PDF export
     */
    generateQuoteHTML(result) {
        const { breakdown, inputs, formatted, currencySymbol } = result;

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>3D Print Quote</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
        h1 { color: #8b5cf6; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px; }
        .section { margin: 20px 0; }
        .section h2 { color: #333; font-size: 1.2em; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        td, th { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; }
        .total { font-size: 1.5em; font-weight: bold; color: #8b5cf6; text-align: right; margin-top: 20px; }
        .footer { margin-top: 40px; font-size: 0.9em; color: #666; text-align: center; }
    </style>
</head>
<body>
    <h1>3D Print Quote</h1>

    <div class="section">
        <h2>Model Details</h2>
        <table>
            <tr><td>Material</td><td>${inputs.materialName}</td></tr>
            <tr><td>Volume</td><td>${inputs.volume.toFixed(2)} cm³</td></tr>
            <tr><td>Weight</td><td>${inputs.weight.toFixed(1)} g</td></tr>
            <tr><td>Infill</td><td>${inputs.infillPercent}%</td></tr>
            <tr><td>Print Time</td><td>${inputs.printTimeHours.toFixed(1)} hours</td></tr>
            <tr><td>Quantity</td><td>${inputs.quantity} pcs</td></tr>
        </table>
    </div>

    <div class="section">
        <h2>Cost Breakdown</h2>
        <table>
            <tr><th>Item</th><th>Cost</th></tr>
            <tr><td>Material</td><td>${formatted.breakdown.material}</td></tr>
            <tr><td>Electricity</td><td>${formatted.breakdown.electricity}</td></tr>
            <tr><td>Printer Depreciation</td><td>${formatted.breakdown.depreciation}</td></tr>
            <tr><td>Maintenance</td><td>${formatted.breakdown.maintenance}</td></tr>
            <tr><td>Labor</td><td>${formatted.breakdown.labor}</td></tr>
            <tr><td>Risk Adjustment</td><td>${formatted.breakdown.risk}</td></tr>
            <tr><td>Profit Margin</td><td>${formatted.breakdown.profit}</td></tr>
        </table>
    </div>

    <div class="total">
        <p>Price per piece: ${formatted.pricePerPiece}</p>
        <p>Total (${inputs.quantity} pcs): ${formatted.totalPrice}</p>
    </div>

    <div class="footer">
        <p>Generated by 3D Print Calculator - AdHUB</p>
        <p>Date: ${new Date().toLocaleDateString()}</p>
    </div>
</body>
</html>
        `;
    }
};

// Export for use in other modules
window.PricingEngine = PricingEngine;
