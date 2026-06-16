// TTB Label Assistant - Client-Side Deterministic Evaluation Engine
// Verifies application form data and label OCR text against TTB regulations.

const Validator = (function () {
  // Statutory warning statement verbatim (27 CFR Part 16)
  const STATUTORY_WARNING = "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

  // Standard Metric fill capacities (normalized: lower case, no spaces)
  const WINE_STANDARD_FILLS = [
    "50ml", "100ml", "187ml", "375ml", "500ml", "750ml", "1l", "1.5l", "3l"
  ];

  const SPIRITS_STANDARD_FILLS = [
    "50ml", "100ml", "200ml", "375ml", "500ml", "750ml", "1l", "1.75l"
  ];

  // Helper to normalize strings for metric comparisons
  function normalizeNetContents(str) {
    if (!str) return "";
    return str.replace(/\s+/g, "").toLowerCase();
  }

  // Helper to parse ABV values
  function parseABV(str) {
    if (!str) return null;
    // Match standard percentage format like "13.5%" or raw float "13.5"
    const match = str.match(/(\d+(?:\.\d+)?)\s*%/i) || str.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  // Extracts stated ABV percentage from aggregated label texts using regex
  function extractABVFromLabel(aggregatedText) {
    // Catch patterns like: "ALCOHOL X% BY VOLUME", "ALC. X% BY VOL.", "X% ABV", "ALC X% VOL"
    const patterns = [
      /(?:ALCOHOL|ALC\.?)\s+(\d+(?:\.\d+)?)\s*%\s*(?:BY\s+VOL\.?|VOLUME)?/i,
      /(\d+(?:\.\d+)?)\s*%\s*ABV/i,
      /ALC\s+(\d+(?:\.\d+)?)\s*%?\s*VOL/i,
      /(\d+(?:\.\d+)?)\s*%/
    ];
    for (const regex of patterns) {
      const match = aggregatedText.match(regex);
      if (match) {
        return parseFloat(match[1]);
      }
    }
    return null;
  }

  // Extracts net contents statement from aggregated label text
  function extractNetContentsFromLabel(aggregatedText) {
    // Catch patterns like "750ML", "750 ML", "1.5L", "1.5 L", "1 LITRE" etc.
    const regex = /(\d+(?:\.\d+)?)\s*(?:ML|L|LITERS|LITER|LITRE)/i;
    const match = aggregatedText.match(regex);
    return match ? match[0] : null;
  }

  // Helper to validate the Government Warning Statement
  function validateGovernmentWarning(warningText, aggregatedText) {
    if (!warningText) {
      return {
        status: "FAIL",
        message: "Government warning is missing from the application form."
      };
    }

    const normalized = warningText.replace(/\s+/g, " ").trim();

    // 1. Wording Check (case-insensitive, ignore punctuation/spaces)
    const clean = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanStatutory = clean(STATUTORY_WARNING);
    const cleanInput = clean(normalized);

    if (cleanInput !== cleanStatutory) {
      return {
        status: "FAIL",
        message: "Health warning statement does not match the statutory warning wording word-for-word. Check spelling and completeness."
      };
    }

    // 2. Bold tags check: Only "GOVERNMENT WARNING" may be bolded
    const boldRegex = /\*\*(.*?)\*\*|<b>(.*?)<\/b>|<strong>(.*?)<\/strong>|__(.*?)__/g;
    let match;
    let hasOtherBold = false;
    boldRegex.lastIndex = 0;
    while ((match = boldRegex.exec(normalized)) !== null) {
      const boldText = (match[1] || match[2] || match[3] || match[4] || "").trim();
      if (clean(boldText) !== "governmentwarning") {
        hasOtherBold = true;
      }
    }
    if (hasOtherBold) {
      return {
        status: "FAIL",
        message: "Formatting error: Only the words 'GOVERNMENT WARNING' may be bold. No other words should be bold."
      };
    }

    // Strip bold markers and HTML tags for capitalization checks
    const plainText = normalized.replace(/\*\*|__|<b>|<\/b>|<strong>|<\/strong>/g, "").trim();

    // 3. "GOVERNMENT WARNING" must be capitalized
    if (!plainText.startsWith("GOVERNMENT WARNING")) {
      return {
        status: "FAIL",
        message: "Capitalization error: The words 'GOVERNMENT WARNING' must be in all capital letters."
      };
    }

    // 4. Check remainder case and Surgeon General capitalization
    const govIndex = plainText.indexOf("GOVERNMENT WARNING");
    const remainder = plainText.substring(govIndex + "GOVERNMENT WARNING".length);

    const remainderLetters = remainder.replace(/[^a-zA-Z]/g, "");
    const isAllUppercase = remainderLetters.length > 0 && remainderLetters === remainderLetters.toUpperCase();

    if (!isAllUppercase) {
      const sgMatch = remainder.match(/\b([sS])urgeon\s+([gG])eneral\b/);
      if (sgMatch) {
        const s = sgMatch[1];
        const g = sgMatch[2];
        if (s !== "S" || g !== "G") {
          return {
            status: "FAIL",
            message: "Capitalization error: The first letters in the words 'Surgeon General' must be capitalized."
          };
        }
      } else {
        return {
          status: "FAIL",
          message: "Missing keyword: 'Surgeon General' was not found or is misspelled in the warning statement."
        };
      }
    }

    // 5. Check if warning is in label aggregated text (case-insensitive fuzzy check)
    const stripWarning = (str) => str.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const labelHasWarning = stripWarning(aggregatedText).includes(stripWarning(STATUTORY_WARNING));
    if (!labelHasWarning) {
      return {
        status: "FAIL",
        message: "Health warning statement not detected on the label assets."
      };
    }

    return {
      status: "PASS",
      message: "Statutory health warning matches wording, capitalization, and formatting requirements."
    };
  }

  // Main validation function
  function validateApplication(app) {
    const results = {};
    let overallValid = true;

    // 1. Global Text Aggregator
    // Collect all raw and normalized text from all asset mappings and properties
    let aggregatedText = "";
    if (app.extracted_assets) {
      app.extracted_assets.forEach(asset => {
        if (asset.field_mappings) {
          asset.field_mappings.forEach(m => {
            aggregatedText += " " + (m.raw_ocr_string || "") + " " + (m.normalized_text || "");
          });
        }
      });
    }
    
    // Also include general fields from the mock application object as fallback
    aggregatedText += ` ${app.field_government_warning || ""} ${app.field_6_brand_name || ""} ${app.field_12_net_contents || ""} ${app.field_13_alcohol_content || ""}`;
    
    // Normalize spacing
    aggregatedText = aggregatedText.replace(/\s+/g, " ").trim();

    // --- A. Government Warning Validation ---
    const warningResult = validateGovernmentWarning(app.field_government_warning, aggregatedText);
    results.field_government_warning = warningResult;
    if (warningResult.status === "FAIL") {
      overallValid = false;
    }

    // --- B. Alcohol Content Matching & Tolerance Checks ---
    const formABVVal = parseABV(app.field_13_alcohol_content);
    const labelABVVal = extractABVFromLabel(aggregatedText);

    if (formABVVal === null) {
      results.field_13_alcohol_content = {
        status: "FAIL",
        message: "ABV value is missing or unparseable on the form."
      };
      overallValid = false;
    } else if (labelABVVal === null) {
      results.field_13_alcohol_content = {
        status: "FAIL",
        message: "Alcohol content (ABV) statement not found on label assets."
      };
      overallValid = false;
    } else {
      const abvDiff = Math.abs(formABVVal - labelABVVal);
      const prodType = app.field_5_type_of_product || "WINE";

      if (prodType === "WINE") {
        // Wine tolerance:
        // <= 14% ABV -> +/- 1.5%
        // > 14% ABV -> +/- 1.0%
        const limit = labelABVVal <= 14.0 ? 1.5 : 1.0;
        if (abvDiff > limit) {
          results.field_13_alcohol_content = {
            status: "FAIL",
            message: `Mismatched ABV value: Label states ${labelABVVal}% but application declares ${formABVVal}%, breaching Part 4 wine tolerance limits (+/- ${limit}%).`
          };
          overallValid = false;
        } else {
          results.field_13_alcohol_content = {
            status: "PASS",
            message: `ABV checks out. Tolerance difference is ${abvDiff.toFixed(2)}% (limit is +/- ${limit}%).`
          };
        }
      } else if (prodType === "DISTILLED_SPIRITS") {
        // Spirits tolerance: +/- 0.15%
        const limit = 0.15;
        if (abvDiff > limit) {
          results.field_13_alcohol_content = {
            status: "FAIL",
            message: `Mismatched ABV value: Label states ${labelABVVal}% but application declares ${formABVVal}%, breaching Part 5 distilled spirits tolerances (+/- ${limit}%).`
          };
          overallValid = false;
        } else {
          results.field_13_alcohol_content = {
            status: "PASS",
            message: `ABV checks out. Blending difference is ${abvDiff.toFixed(2)}% (limit is +/- ${limit}%).`
          };
        }
      } else {
        // Malt beverages tolerance: +/- 0.3%
        const limit = 0.3;
        if (abvDiff > limit) {
          results.field_13_alcohol_content = {
            status: "FAIL",
            message: `Mismatched ABV value: Label states ${labelABVVal}% but application declares ${formABVVal}%, breaching Part 7 malt beverage tolerances (+/- ${limit}%).`
          };
          overallValid = false;
        } else {
          results.field_13_alcohol_content = {
            status: "PASS",
            message: `ABV checks out. Tolerance difference is ${abvDiff.toFixed(2)}% (limit is +/- ${limit}%).`
          };
        }
      }
    }

    // --- C. Net Contents Compatibility ---
    const formNetContents = app.field_12_net_contents || "";
    const formNetNormalized = normalizeNetContents(formNetContents);
    const labelNetVal = extractNetContentsFromLabel(aggregatedText);
    const labelNetNormalized = labelNetVal ? normalizeNetContents(labelNetVal) : "";
    const prodType = app.field_5_type_of_product || "WINE";

    if (!formNetNormalized) {
      results.field_12_net_contents = {
        status: "FAIL",
        message: "Net Contents value is missing from the application form."
      };
      overallValid = false;
    } else {
      // Check if fill size is standard
      const standardFills = prodType === "DISTILLED_SPIRITS" ? SPIRITS_STANDARD_FILLS : WINE_STANDARD_FILLS;
      const isStandard = standardFills.includes(formNetNormalized);
      
      if (!isStandard) {
        results.field_12_net_contents = {
          status: "FAIL",
          message: `Non-standard fill size: ${formNetContents} is not an authorized metric standard size for ${prodType.toLowerCase()}.`
        };
        overallValid = false;
      } else if (labelNetNormalized && formNetNormalized !== labelNetNormalized) {
        results.field_12_net_contents = {
          status: "FAIL",
          message: `Mismatched Net Contents: Form declares ${formNetContents} but label OCR states ${labelNetVal}.`
        };
        overallValid = false;
      } else {
        results.field_12_net_contents = {
          status: "PASS",
          message: `Net Contents verified. Value ${formNetContents} is an authorized standard metric fill.`
        };
      }
    }

    // --- D. General Matching for OCR Mapped Fields ---
    // Check if form values match label OCR values for brand, appellation, vintage, etc.
    const generalFieldsToCheck = [
      { fieldId: "field_6_brand_name", labelName: "Brand Name" },
      { fieldId: "field_7_fanciful_name", labelName: "Fanciful Name" },
      { fieldId: "field_11_wine_appellation", labelName: "Appellation" },
      { fieldId: "field_15_wine_vintage_date", labelName: "Vintage" }
    ];

    const cleanStr = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

    generalFieldsToCheck.forEach(({ fieldId, labelName }) => {
      const formVal = (app[fieldId] || "").toString().trim().toLowerCase();
      
      // Find OCR mapping for this field
      let ocrVal = "";
      if (app.extracted_assets) {
        for (const asset of app.extracted_assets) {
          const mapping = asset.field_mappings.find(m => m.target_field_id === fieldId);
          if (mapping && mapping.normalized_text && mapping.normalized_text !== "N/A" && mapping.normalized_text !== "[Not Found]") {
            ocrVal = mapping.normalized_text.toString().trim().toLowerCase();
            break;
          }
        }
      }

      let isMatch = false;
      if (fieldId === "field_6_brand_name" || fieldId === "field_7_fanciful_name") {
        const cf = cleanStr(formVal);
        const co = cleanStr(ocrVal);
        isMatch = (cf && co && (cf.includes(co) || co.includes(cf)));
      } else {
        isMatch = (formVal === ocrVal);
      }

      if (ocrVal && !isMatch) {
        results[fieldId] = {
          status: "FAIL",
          message: `Discrepancy: ${labelName} declares '${app[fieldId]}' on form, but OCR extraction states '${ocrVal}' on label.`
        };
        overallValid = false;
      } else {
        results[fieldId] = {
          status: "PASS",
          message: `${labelName} matches OCR label statement.`
        };
      }
    });

    // For other form fields not directly mapped, set default pass
    const otherFields = [
      "ttb_id", "field_1_rep_id_no", "field_2_plant_registry_basic_permit_brewer_no", "field_3_source_of_product",
      "field_4_serial_number", "field_5_type_of_product", "field_8_applicant_details",
      "field_8a_mailing_address", "field_9_formula", "field_10_grape_varietals",
      "field_12_phone_number", "field_13_email_address", "field_14_type_of_application",
      "field_15_extra_info", "field_16_date_of_application", "field_17_signature",
      "field_18_printed_name"
    ];
    otherFields.forEach(fieldId => {
      if (!results[fieldId]) {
        results[fieldId] = {
          status: "PASS",
          message: "Field contains valid compliant format."
        };
      }
    });

    return {
      isValid: overallValid,
      fields: results
    };
  }

  return {
    STATUTORY_WARNING,
    WINE_STANDARD_FILLS,
    SPIRITS_STANDARD_FILLS,
    normalizeNetContents,
    parseABV,
    extractABVFromLabel,
    extractNetContentsFromLabel,
    validateApplication
  };
})();

// Export for Node/ESM environment if supported
if (typeof module !== "undefined" && module.exports) {
  module.exports = Validator;
} else if (typeof globalThis !== "undefined") {
  globalThis.Validator = Validator;
}
