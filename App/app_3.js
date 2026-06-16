// TTB Label Assistant Frontend Orchestration

// Global address string configuration for routing upload assets
const UPLOAD_ENDPOINT = 'https://ttb-label-assistant.bryant-esendencia.workers.dev/';

// --- MOCK DATABASE (Conforming to Multi-Image Manifest Manifold Schema) ---
const MOCK_APPLICATIONS = [];

// --- FRIENDLY FIELD NAMES FOR TOOLTIPS ---
const FIELD_NAMES = {
  "ttb_id": "TTB ID",
  "field_1_rep_id_no": "1. Rep. ID No. (If any)",
  "field_2_plant_registry_basic_permit_brewer_no": "2. Plant Registry/Basic Permit/Brewer's No.",
  "field_3_source_of_product": "3. Source of Product",
  "field_4_serial_number": "4. Serial Number",
  "field_5_type_of_product": "5. Type of Product",
  "field_6_brand_name": "6. Brand Name",
  "field_7_fanciful_name": "7. Fanciful Name (If any)",
  "field_8_applicant_details": "8. Name & Address of Applicant",
  "field_8a_mailing_address": "8a. Mailing Address (If different)",
  "field_9_formula": "9. Formula",
  "field_10_grape_varietals": "10. Grape Varietal(s) (Wine only)",
  "field_11_wine_appellation": "11. Wine Appellation (If on label)",
  "field_12_phone_number": "12. Phone Number",
  "field_13_email_address": "13. Email Address",
  "field_14_type_of_application": "14. Type of Application",
  "field_15_extra_info": "15. Extra Information / Translations",
  "field_16_date_of_application": "16. Date of Application",
  "field_17_signature": "17. Signature of Applicant",
  "field_18_printed_name": "18. Printed Name of Applicant",
  "field_government_warning": "Government Warning Statement"
};

// --- STATE MANAGEMENT ---
let currentAppIndex = 0;
let currentLabelIndex = 0;
let activeFilter = "all";

// --- HELPER FUNCTIONS FOR DYNAMIC COORDINATE MAPPING ---
const getFieldCenter = (asset, fieldId, defX, defY) => {
  const w = asset.dimensions.width_pixels;
  const h = asset.dimensions.height_pixels;
  const mapping = asset.field_mappings.find(m => m.target_field_id === fieldId);
  if (!mapping) return { x: defX, y: defY };
  const box = mapping.bounding_box;
  if (box.x_min === 0 && box.y_min === 0 && box.x_max === 0 && box.y_max === 0) {
    return { x: defX, y: defY };
  }
  return {
    x: ((box.x_min + box.x_max) / 2) / 1000 * w,
    y: ((box.y_min + box.y_max) / 2) / 1000 * h
  };
};

const getFieldBox = (asset, fieldId, defX, defY, defW, defH) => {
  const w = asset.dimensions.width_pixels;
  const h = asset.dimensions.height_pixels;
  const mapping = asset.field_mappings.find(m => m.target_field_id === fieldId);
  if (!mapping) return { x: defX, y: defY, w: defW, h: defH };
  const box = mapping.bounding_box;
  if (box.x_min === 0 && box.y_min === 0 && box.x_max === 0 && box.y_max === 0) {
    return { x: defX, y: defY, w: defW, h: defH };
  }
  return {
    x: box.x_min / 1000 * w,
    y: box.y_min / 1000 * h,
    w: (box.x_max - box.x_min) / 1000 * w,
    h: (box.y_max - box.y_min) / 1000 * h
  };
};

// --- SVG RENDERERS (Ensures zero-cloud, static, lightweight assets) ---
const SVG_TEMPLATES = {
  FRONT: (app, asset) => {
    const w = asset.dimensions.width_pixels;
    const h = asset.dimensions.height_pixels;

    const brand = getFieldCenter(asset, "field_6_brand_name", w / 2, 400);
    const fanciful = getFieldCenter(asset, "field_7_fanciful_name", w / 2, 470);

    const appText = app.field_11_wine_appellation !== "N/A" ? app.field_11_wine_appellation : app.field_5_type_of_product;
    const appField = "field_11_wine_appellation";
    const appellation = getFieldCenter(asset, appField, w / 2, 580);

    const vintage = getFieldCenter(asset, "field_15_wine_vintage_date", w / 2, 660);

    const hasFanciful = app.field_7_fanciful_name !== "N/A";
    const hasVintage = app.field_15_wine_vintage_date !== null && app.field_15_wine_vintage_date !== "N/A";
    const hasAppellation = appText !== "N/A";

    let crestHtml = "";
    if (app.field_6_brand_name.toUpperCase().includes("SILVER OAK")) {
      crestHtml = `
        <g transform="translate(${w / 2 - 50}, 160)">
          <path d="M 20 60 L 20 40 L 35 40 L 35 50 L 45 50 L 45 30 L 55 30 L 55 50 L 65 50 L 65 40 L 80 40 L 80 60 Z" fill="none" stroke="#b45309" stroke-width="3"/>
          <rect x="25" y="60" width="50" height="20" fill="none" stroke="#b45309" stroke-width="3"/>
          <line x1="50" y1="30" x2="50" y2="80" stroke="#b45309" stroke-width="2"/>
        </g>
      `;
    } else if (app.field_6_brand_name.toUpperCase().includes("MACALLAN")) {
      crestHtml = `
        <g transform="translate(${w / 2 - 50}, 160)">
          <path d="M 20 20 L 80 20 L 70 70 L 50 90 L 30 70 Z" fill="none" stroke="#b45309" stroke-width="3"/>
          <line x1="50" y1="20" x2="50" y2="90" stroke="#b45309" stroke-dasharray="2,2"/>
        </g>
      `;
    }

    let bottomMetadataHtml = "";
    const abvText = app.field_13_alcohol_content !== "N/A" ? `ALC. ${app.field_13_alcohol_content} BY VOL.` : "[Missing] BY VOL.";
    if (app.field_6_brand_name.toUpperCase().includes("MACALLAN")) {
      bottomMetadataHtml = `
        <text x="${w / 2}" y="${h - 100}" font-family="'Inter', sans-serif" font-size="14" font-weight="600" fill="#64748b" text-anchor="middle">
          PRODUCED & BOTTLED IN SCOTLAND
        </text>
        <text x="${w / 2}" y="${h - 70}" font-family="'Inter', sans-serif" font-size="14" font-weight="600" fill="#64748b" text-anchor="middle">
          ${app.field_12_net_contents} - ${abvText}
        </text>
      `;
    } else {
      bottomMetadataHtml = `
        <text x="${w / 2}" y="${h - 120}" font-family="'Inter', sans-serif" font-size="14" font-weight="600" fill="#64748b" text-anchor="middle" letter-spacing="1.5">
          PRODUCED & BOTTLED IN USA
        </text>
        <text x="${w / 2}" y="${h - 90}" font-family="'Inter', sans-serif" font-size="15" font-weight="600" fill="#334155" text-anchor="middle" letter-spacing="1">
          ${app.field_12_net_contents} - ${abvText}
        </text>
      `;
    }

    return `
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${w}" height="${h}" fill="#fcfbf7" stroke="#e2e8f0" stroke-width="1"/>
        <rect x="25" y="25" width="${w - 50}" height="${h - 50}" fill="none" stroke="#e2d4b7" stroke-width="4"/>
        <rect x="32" y="32" width="${w - 64}" height="${h - 64}" fill="none" stroke="#e2d4b7" stroke-width="1"/>
        
        ${crestHtml}

        <text x="${brand.x}" y="${brand.y}" font-family="'Playfair Display', 'Georgia', serif" font-size="42" font-weight="700" fill="#0f172a" text-anchor="middle" letter-spacing="2">
          ${app.field_6_brand_name.toUpperCase()}
        </text>

        ${hasFanciful ? `
        <text x="${fanciful.x}" y="${fanciful.y}" font-family="'Playfair Display', 'Georgia', serif" font-size="18" font-style="italic" fill="#b45309" text-anchor="middle" letter-spacing="1">
          ${app.field_7_fanciful_name}
        </text>
        ` : ''}

        ${hasAppellation ? `
        <text x="${appellation.x}" y="${appellation.y}" font-family="'Inter', sans-serif" font-size="16" font-style="italic" fill="#334155" text-anchor="middle" letter-spacing="2">
          ${appText.toUpperCase()}
        </text>
        ` : ''}

        ${hasVintage ? `
        <text x="${vintage.x}" y="${vintage.y}" font-family="'Playfair Display', 'Georgia', serif" font-size="32" font-weight="600" fill="#1e293b" text-anchor="middle">
          ${app.field_15_wine_vintage_date}
        </text>
        ` : ''}

        ${bottomMetadataHtml}
      </svg>
    `;
  },
  BACK: (app, asset) => {
    const w = asset.dimensions.width_pixels;
    const h = asset.dimensions.height_pixels;

    const brand = getFieldCenter(asset, "field_6_brand_name", w / 2, 100);

    const hasAbv = app.field_13_alcohol_content !== "N/A";
    const abv = getFieldCenter(asset, "field_13_alcohol_content", 720, 350);
    const abvValue = app.field_13_alcohol_content !== "N/A" ? `${app.field_13_alcohol_content}` : "[Missing]";

    const hasNetContents = app.field_12_net_contents !== "N/A";
    const netContents = getFieldCenter(asset, "field_12_net_contents", 720, 470);

    const warningBox = getFieldBox(asset, "field_government_warning", 648, 588, 432, 364);

    let historyHtml = "";

    let detailsHtml = "";
    if (app.field_8_applicant_details) {
      detailsHtml = `
        <text x="${w / 2}" y="150" font-family="'Inter', sans-serif" font-size="14" font-weight="600" fill="#475569" text-anchor="middle" letter-spacing="1">
          ${app.field_8_applicant_details.replace(/\n/g, ' • ')}
        </text>
      `;
    }

    let barcodeHtml = `
      <g transform="translate(${w / 2 - 100}, ${h - 180})">
        <rect x="0" y="0" width="6" height="60" fill="#1e293b"/>
        <rect x="10" y="0" width="3" height="60" fill="#1e293b"/>
        <rect x="18" y="0" width="12" height="60" fill="#1e293b"/>
        <rect x="36" y="0" width="6" height="60" fill="#1e293b"/>
        <rect x="48" y="0" width="3" height="60" fill="#1e293b"/>
        <rect x="54" y="0" width="18" height="60" fill="#1e293b"/>
        <rect x="78" y="0" width="6" height="60" fill="#1e293b"/>
        <rect x="90" y="0" width="12" height="60" fill="#1e293b"/>
        <rect x="108" y="0" width="3" height="60" fill="#1e293b"/>
        <rect x="114" y="0" width="18" height="60" fill="#1e293b"/>
        <rect x="138" y="0" width="6" height="60" fill="#1e293b"/>
        <rect x="150" y="0" width="12" height="60" fill="#1e293b"/>
        <rect x="168" y="0" width="3" height="60" fill="#1e293b"/>
        <rect x="174" y="0" width="12" height="60" fill="#1e293b"/>
        <rect x="194" y="0" width="6" height="60" fill="#1e293b"/>
        <text x="100" y="75" font-family="'Inter', sans-serif" font-size="10" fill="#475569" text-anchor="middle" letter-spacing="4">8 782532 007672</text>
      </g>
    `;

    return `
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${w}" height="${h}" fill="#fcfbf7" stroke="#e2e8f0" stroke-width="1"/>
        <rect x="25" y="25" width="${w - 50}" height="${h - 50}" fill="none" stroke="#e2d4b7" stroke-width="4"/>
        <rect x="32" y="32" width="${w - 64}" height="${h - 64}" fill="none" stroke="#e2d4b7" stroke-width="1"/>
        
        <text x="${brand.x}" y="${brand.y}" font-family="'Playfair Display', 'Georgia', serif" font-size="32" font-weight="700" fill="#0f172a" text-anchor="middle" letter-spacing="2">
          ${app.field_6_brand_name.toUpperCase()}
        </text>
        <text x="${brand.x}" y="${brand.y + 30}" font-family="'Inter', sans-serif" font-size="12" font-weight="700" fill="#94a3b8" text-anchor="middle" letter-spacing="1.5">
          ESTATE COMPLIANCE BACK LABEL
        </text>

        ${detailsHtml}
        ${historyHtml}

        ${hasAbv ? `
        <g transform="translate(${abv.x}, ${abv.y})">
          <text x="0" y="-15" font-family="'Inter', sans-serif" font-size="11" font-weight="700" fill="#94a3b8" text-anchor="middle" letter-spacing="1">ALCOHOL CONTENT:</text>
          <text x="0" y="10" font-family="'Inter', sans-serif" font-size="16" font-weight="700" fill="#1e293b" text-anchor="middle">${abvValue}</text>
        </g>
        ` : ''}

        ${hasNetContents ? `
        <g transform="translate(${netContents.x}, ${netContents.y})">
          <text x="0" y="-15" font-family="'Inter', sans-serif" font-size="11" font-weight="700" fill="#94a3b8" text-anchor="middle" letter-spacing="1">NET CONTENTS:</text>
          <text x="0" y="10" font-family="'Inter', sans-serif" font-size="16" font-weight="700" fill="#1e293b" text-anchor="middle">${app.field_12_net_contents}</text>
        </g>
        ` : ''}

        <g transform="translate(${warningBox.x}, ${warningBox.y})">
          <rect x="0" y="0" width="${warningBox.w}" height="${warningBox.h}" fill="none" stroke="#cbd5e1" stroke-width="1.5" rx="4"/>
          <text x="${warningBox.w / 2}" y="25" font-family="'Inter', sans-serif" font-size="11" font-weight="800" fill="#0f172a" text-anchor="middle" letter-spacing="1.5">GOVERNMENT WARNING</text>
          <text x="15" y="50" font-family="'Inter', sans-serif" font-size="9.5" font-weight="500" fill="#334155">
            <tspan x="15" dy="0" font-weight="700">(1) According to the Surgeon General, women</tspan>
            <tspan x="15" dy="14">should not drink alcoholic beverages during</tspan>
            <tspan x="15" dy="14">pregnancy because of the risk of birth defects.</tspan>
            <tspan x="15" dy="20" font-weight="700">(2) Consumption of alcoholic beverages</tspan>
            <tspan x="15" dy="14">impairs your ability to drive a car or operate</tspan>
            <tspan x="15" dy="14">machinery, and may cause health problems.</tspan>
          </text>
        </g>

        ${barcodeHtml}
      </svg>
    `;
  },
  NECK: (app, asset) => {
    const w = asset.dimensions.width_pixels;
    const h = asset.dimensions.height_pixels;

    const brand = getFieldCenter(asset, "field_6_brand_name", w / 2, 290);
    const hasBrand = app.field_6_brand_name !== "N/A";

    return `
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${w}" height="${h}" fill="#fcfbf7" stroke="#e2e8f0" stroke-width="1"/>
        <rect x="15" y="15" width="${w - 30}" height="${h - 30}" fill="none" stroke="#e2d4b7" stroke-width="3"/>
        
        <g transform="translate(${w / 2 - 25}, 80)">
          <path d="M 5 25 L 25 5 L 45 25 Z" fill="none" stroke="#b45309" stroke-width="2"/>
          <rect x="12" y="17" width="26" height="15" fill="none" stroke="#b45309" stroke-width="2"/>
        </g>

        <text x="60" y="150" font-family="'Inter', sans-serif" font-size="11" font-weight="700" fill="#94a3b8" letter-spacing="1">ESTATE</text>
        <text x="${w - 120}" y="150" font-family="'Inter', sans-serif" font-size="11" font-weight="700" fill="#94a3b8" letter-spacing="1">BOTTLED</text>

        ${hasBrand ? `
        <text x="${brand.x}" y="${brand.y}" font-family="'Playfair Display', 'Georgia', serif" font-size="24" font-weight="700" fill="#0f172a" text-anchor="middle" letter-spacing="1.5">
          ${app.field_6_brand_name.toUpperCase()}
        </text>
        ` : ''}
      </svg>
    `;
  }
};

// --- DOM ELEMENT REFERENCES ---
const triageList = document.getElementById("triage-list-container");
const triageSearch = document.getElementById("triage-search");
const filterTabs = document.querySelectorAll(".filter-tab");

const carouselPrev = document.getElementById("carousel-prev");
const carouselNext = document.getElementById("carousel-next");
const carouselLabelType = document.getElementById("carousel-label-type");
const activeLabelWrapper = document.getElementById("active-label-wrapper");
const coordinateOverlay = document.getElementById("coordinate-overlay");

const hudLatency = document.getElementById("hud-latency");
const hudClarity = document.getElementById("hud-clarity");
const hudOverride = document.getElementById("hud-override");

const complianceForm = document.getElementById("cola-compliance-form");
const btnApprove = document.getElementById("btn-approve");
const btnCorrect = document.getElementById("btn-correct");
const btnReject = document.getElementById("btn-reject");

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  renderTriageList();
  loadApplication(0);
  setupEventListeners();
});

// --- CORE FUNCTIONS ---

// 1. Render sidebar application triage list
function renderTriageList() {
  triageList.innerHTML = "";

  const query = triageSearch.value.toLowerCase();

  const filteredApps = MOCK_APPLICATIONS.filter((app, index) => {
    // Search query filter
    const matchesSearch = String(app.ttb_application_id).includes(query) || app.brand_name.toLowerCase().includes(query);

    // Status tab filter
    const matchesFilter = activeFilter === "all" || app.status === activeFilter;

    return matchesSearch && matchesFilter;
  });

  if (filteredApps.length === 0) {
    triageList.innerHTML = `<div class="empty-state">No matching applications.</div>`;
    return;
  }

  filteredApps.forEach((app) => {
    const originalIndex = MOCK_APPLICATIONS.findIndex(a => a.ttb_application_id === app.ttb_application_id);

    // Check if clarity warning is present for any active asset block
    let hasClarityWarning = false;
    if (app.extracted_assets) {
      hasClarityWarning = app.extracted_assets.some(asset =>
        asset.transcription_quality_summary &&
        (asset.transcription_quality_summary.global_clarity_score < 85 ||
          asset.transcription_quality_summary.hallucination_override_active === true)
      );
    }

    const displayStatus = hasClarityWarning ? "warn" : app.status.toLowerCase();

    const item = document.createElement("div");
    item.className = `triage-item status-${displayStatus} ${originalIndex === currentAppIndex ? "active" : ""}`;
    item.setAttribute("role", "button");
    item.setAttribute("tabindex", "0");
    item.dataset.index = originalIndex;

    const badgeClass = `triage-badge badge-${displayStatus}`;
    const badgeText = hasClarityWarning ? "WARN (CLARITY)" : app.status.replace("_", " ");

    item.innerHTML = `
      <div class="triage-item-header">
        <span class="triage-id">${app.ttb_application_id}</span>
        <span class="${badgeClass}">${badgeText}</span>
      </div>
      <div class="triage-item-body">
        <span class="triage-brand">${app.brand_name}</span>
        <span class="triage-time">${app.vintage !== "N/A" ? app.vintage : ""}</span>
      </div>
    `;

    // Click selection handler
    item.addEventListener("click", () => {
      loadApplication(originalIndex);
    });

    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        loadApplication(originalIndex);
      }
    });

    triageList.appendChild(item);
  });
}

// 2. Load selected application details into Panels 2 and 3
function loadApplication(index) {
  currentAppIndex = index;
  currentLabelIndex = 0; // Default to first available asset (usually FRONT)

  const app = MOCK_APPLICATIONS[index];

  // Highlight active sidebar triage list item
  document.querySelectorAll(".triage-item").forEach((item) => {
    item.classList.remove("active");
    if (parseInt(item.dataset.index) === index) {
      item.classList.add("active");
    }
  });

  if (!app) {
    clearFormUI();
    activeLabelWrapper.innerHTML = `<div class="empty-state">No label assets loaded. Upload an asset or JSON manifest to begin.</div>`;
    coordinateOverlay.innerHTML = "";
    carouselLabelType.textContent = "LABEL";
    hudLatency.textContent = "0 ms";
    hudClarity.textContent = "0%";
    hudOverride.textContent = "STANDBY";
    hudOverride.style.color = "var(--status-pass)";
    const panelHeader = document.querySelector(".panel-form .panel-header");
    if (panelHeader) panelHeader.classList.remove("warning-state");
    const cautionBanner = document.getElementById("circuit-breaker-banner");
    if (cautionBanner) cautionBanner.style.display = "none";
    const overrideContainer = document.getElementById("override-container");
    if (overrideContainer) overrideContainer.style.display = "none";
    return;
  }

  // Clear any residual states/classes
  clearFormUI();

  // Populate Panel 3: Form Fields
  populateFormFields(app);

  // Load Active Label Asset in Panel 2 Carousel Viewport
  renderActiveLabel();

  // Execute client-side regulatory validator
  executeValidationPipeline();
}

// 3. Populate TTB Form 5100.31 input fields
function populateFormFields(app) {
  document.getElementById("ttb_id_input").value = app.ttb_application_id || "";
  document.getElementById("field_1_rep_id_no").value = app.field_1_rep_id_no || "";
  document.getElementById("field_2_plant_registry_basic_permit_brewer_no").value = app.field_2_plant_registry_basic_permit_brewer_no || "";
  document.getElementById("field_3_source_of_product").value = app.field_3_source_of_product || "Domestic";
  document.getElementById("field_4_serial_number").value = app.field_4_serial_number || "";
  document.getElementById("field_5_type_of_product").value = app.field_5_type_of_product || "MALT BEVERAGE";
  document.getElementById("field_6_brand_name").value = app.field_6_brand_name || "";
  document.getElementById("field_7_fanciful_name").value = app.field_7_fanciful_name || "";
  document.getElementById("field_8_applicant_details").value = app.field_8_applicant_details || "";
  document.getElementById("field_8a_mailing_address").value = app.field_8a_mailing_address || "";
  document.getElementById("field_9_formula").value = app.field_9_formula || "";
  document.getElementById("field_10_grape_varietals").value = app.field_10_grape_varietals || "";
  document.getElementById("field_11_wine_appellation").value = app.field_11_wine_appellation || "";
  document.getElementById("field_12_phone_number").value = app.field_12_phone_number || "";
  document.getElementById("field_13_email_address").value = app.field_13_email_address || "";
  document.getElementById("field_14_type_of_application").value = app.field_14_type_of_application || "";
  document.getElementById("field_15_extra_info").value = app.field_15_extra_info || "";
  document.getElementById("field_16_date_of_application").value = app.field_16_date_of_application || "";
  document.getElementById("field_17_signature").value = app.field_17_signature || "Signature on file";
  document.getElementById("field_18_printed_name").value = app.field_18_printed_name || "";
  if (document.getElementById("field_government_warning")) {
    document.getElementById("field_government_warning").value = app.field_government_warning || "";
  }
}

// 4. Render active carousel label SVG graphic and metrics HUD
function renderActiveLabel() {
  const app = MOCK_APPLICATIONS[currentAppIndex];
  if (!app) {
    activeLabelWrapper.innerHTML = `<div class="empty-state">No label assets loaded. Upload an asset or JSON manifest to begin.</div>`;
    coordinateOverlay.innerHTML = "";
    return;
  }
  const assets = app.extracted_assets;

  if (!assets || assets.length === 0) {
    activeLabelWrapper.innerHTML = `<div class="empty-state">No label assets available.</div>`;
    coordinateOverlay.innerHTML = "";
    return;
  }

  // Set active label asset object
  const activeAsset = assets[currentLabelIndex];
  const type = activeAsset.label_type;

  // Update Carousel Label Type Indicator text
  carouselLabelType.textContent = `${type} LABEL`;

  // Render SVG Vector graphics or local uploaded image layers
  if (activeAsset.local_image_data) {
    const w = activeAsset.dimensions?.width_pixels || 1200;
    const h = activeAsset.dimensions?.height_pixels || 1400;
    activeLabelWrapper.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" style="max-width: 100%; max-height: 100%; aspect-ratio: ${w} / ${h}; width: auto; height: auto; display: block; margin: auto;" xmlns="http://www.w3.org/2000/svg">
        <image href="${activeAsset.local_image_data}" x="0" y="0" width="${w}" height="${h}" />
      </svg>
    `;
  } else if (SVG_TEMPLATES[type]) {
    activeLabelWrapper.innerHTML = SVG_TEMPLATES[type](app, activeAsset);
  } else {
    activeLabelWrapper.innerHTML = `<div class="empty-state">Asset Template Not Found</div>`;
  }

  // Update Performance Metrics HUD Card
  hudLatency.textContent = (activeAsset.latency_ms !== undefined && activeAsset.latency_ms !== null) ? `${activeAsset.latency_ms} ms` : "Pending...";
  hudClarity.textContent = `${activeAsset.transcription_quality_summary.global_clarity_score}%`;

  const overrideActive = activeAsset.transcription_quality_summary.hallucination_override_active;
  hudOverride.textContent = overrideActive ? "ACTIVE" : "STANDBY";
  hudOverride.style.color = overrideActive ? "var(--status-warn)" : "var(--status-pass)";

  // Resize coordinate overlay container to match rendered SVG dimensions
  resizeCoordinateOverlay();

  // Draw coordinate overlays (bounding boxes)
  drawBoundingBoxes(activeAsset.field_mappings);
}

// 4.5 Resize the coordinate overlay container to match the actual visual SVG dimensions
function resizeCoordinateOverlay() {
  const svgEl = activeLabelWrapper.querySelector("svg");
  if (svgEl) {
    const rect = svgEl.getBoundingClientRect();
    const parentEl = document.getElementById("label-view-box-container");
    if (parentEl) {
      const parentRect = parentEl.getBoundingClientRect();
      coordinateOverlay.style.position = "absolute";
      coordinateOverlay.style.left = `${rect.left - parentRect.left}px`;
      coordinateOverlay.style.top = `${rect.top - parentRect.top}px`;
      coordinateOverlay.style.width = `${rect.width}px`;
      coordinateOverlay.style.height = `${rect.height}px`;
    }
  } else {
    coordinateOverlay.style.position = "absolute";
    coordinateOverlay.style.left = "0";
    coordinateOverlay.style.top = "0";
    coordinateOverlay.style.width = "100%";
    coordinateOverlay.style.height = "100%";
  }
}

// 5. Draw bounding boxes on coordinate overlay panel
function drawBoundingBoxes(fieldMappings) {
  coordinateOverlay.innerHTML = "";

  const containerWidth = coordinateOverlay.clientWidth || 1;
  const containerHeight = coordinateOverlay.clientHeight || 1;

  fieldMappings.forEach((mapping) => {
    // If coords are all 0 (missing field), do not render box
    const box = mapping.bounding_box;
    if (box.x_min === 0 && box.y_min === 0 && box.x_max === 0 && box.y_max === 0) {
      return;
    }

    const highlight = document.createElement("div");
    highlight.className = "bounding-box-highlight";
    highlight.dataset.fieldId = mapping.target_field_id;
    highlight.dataset.ocr = mapping.raw_ocr_string;
    highlight.dataset.score = mapping.field_clarity_score;

    // Recalculate using a strict top-left relative boundary framework (raw coordinates divided by 10 to map as percentages):
    const left = box.x_min / 10;
    const width = (box.x_max - box.x_min) / 10;
    const top = box.y_min / 10;
    const height = (box.y_max - box.y_min) / 10;

    highlight.style.left = `${left}%`;
    highlight.style.top = `${top}%`;
    highlight.style.width = `${width}%`;
    highlight.style.height = `${height}%`;

    // Interactive Hover Listeners: link box hover to form field focus
    highlight.addEventListener("mouseenter", () => {
      highlight.classList.add("active");
      linkFieldHighlight(mapping.target_field_id, true);
      showHUDTooltip(highlight, mapping);
    });

    highlight.addEventListener("mouseleave", () => {
      highlight.classList.remove("active");
      linkFieldHighlight(mapping.target_field_id, false);
      hideHUDTooltip();
    });

    coordinateOverlay.appendChild(highlight);
  });
}

// Highlight form fields in Panel 3 corresponding to active bounding boxes
function linkFieldHighlight(fieldId, isHighlighted) {
  const formField = document.querySelector(`.form-field[data-field-id="${fieldId}"]`);
  if (formField) {
    if (isHighlighted) {
      formField.classList.add("highlighted");
      formField.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else {
      formField.classList.remove("highlighted");
    }
  }
}

// 6. Tooltip / HUD Display when hovering boxes
let activeTooltip = null;

function showHUDTooltip(element, mapping) {
  hideHUDTooltip();

  const tooltip = document.createElement("div");
  tooltip.className = "hud-tooltip";

  const fieldFriendlyName = FIELD_NAMES[mapping.target_field_id] || "Field";

  // Format HTML details: showing field name and confidence score (e.g., 'Brand Name (98%)')
  tooltip.innerHTML = `
    <strong>${fieldFriendlyName} (${mapping.field_clarity_score}%)</strong><br/>
    <span style="color: var(--text-secondary); font-size: 0.7rem;">OCR Text: "${mapping.raw_ocr_string}"</span>
  `;

  document.body.appendChild(tooltip);
  activeTooltip = tooltip;

  // Position tooltip close to bounding box element
  const rect = element.getBoundingClientRect();
  tooltip.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
  tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 8}px`;
}

function hideHUDTooltip() {
  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }
}

function clearFormUI() {
  const form = document.getElementById("cola-compliance-form");
  if (form) {
    const inputs = form.querySelectorAll("input, select, textarea");
    inputs.forEach(input => {
      if (input.tagName === "SELECT") {
        input.selectedIndex = 0;
      } else {
        input.value = "";
      }
    });
  }

  // Clear validation classes and badges
  document.querySelectorAll(".form-field").forEach(wrapper => {
    wrapper.classList.remove("validation-pass", "validation-fail", "highlighted");
    const badge = wrapper.querySelector(".field-validation-badge");
    if (badge) badge.remove();
  });

  // Clear visual overlays and tooltips
  if (coordinateOverlay) {
    coordinateOverlay.innerHTML = "";
  }
  hideHUDTooltip();
  hideValidationTooltip();
}

// --- EVENT LISTENERS & SETUP ---

let validationTooltip = null;

function executeValidationPipeline() {
  const app = MOCK_APPLICATIONS[currentAppIndex];
  if (!app) return;

  const hasImages = app.extracted_assets && app.extracted_assets.length > 0 && app.extracted_assets.some(asset => asset.local_image_data);

  if (!hasImages) {
    // Clear out warning header states, banners, etc.
    const panelHeader = document.querySelector(".panel-form .panel-header");
    if (panelHeader) panelHeader.classList.remove("warning-state");
    const cautionBanner = document.getElementById("circuit-breaker-banner");
    if (cautionBanner) cautionBanner.style.display = "none";
    const overrideContainer = document.getElementById("override-container");
    if (overrideContainer) overrideContainer.style.display = "none";
    const btnApprove = document.getElementById("btn-approve");
    if (btnApprove) btnApprove.disabled = false;

    // Reset triage item status
    const currentTriageItem = document.querySelector(`.triage-item[data-index="${currentAppIndex}"]`);
    if (currentTriageItem) {
      currentTriageItem.classList.remove("status-warn", "status-autopass", "status-fail");
      currentTriageItem.classList.add("status-warn");
    }

    // Set all form-field badges to neutral grey "STANDBY"
    const formFields = document.querySelectorAll(".form-field");
    formFields.forEach(wrapper => {
      wrapper.classList.remove("validation-pass", "validation-fail", "highlighted");
      const oldBadge = wrapper.querySelector(".field-validation-badge");
      if (oldBadge) oldBadge.remove();

      const badge = document.createElement("span");
      badge.className = "field-validation-badge";
      badge.style.fontSize = "0.65rem";
      badge.style.fontWeight = "700";
      badge.style.padding = "2px 6px";
      badge.style.borderRadius = "4px";
      badge.style.marginLeft = "8px";
      badge.style.display = "inline-block";
      badge.style.letterSpacing = "0.5px";
      badge.style.textTransform = "uppercase";
      badge.textContent = "STANDBY";
      badge.style.color = "#64748b";
      badge.style.backgroundColor = "#f1f5f9";
      badge.style.border = "1px solid rgba(100, 116, 139, 0.2)";

      const label = wrapper.querySelector("label");
      if (label) {
        label.appendChild(badge);
      }
      wrapper.removeAttribute("data-validation-message");
    });
    return;
  }

  // Read current real-time edited values from Panel 3 form
  const currentFormData = {
    ...app,
    ttb_application_id: document.getElementById("ttb_id_input") ? document.getElementById("ttb_id_input").value : app.ttb_application_id,
    field_1_rep_id_no: document.getElementById("field_1_rep_id_no") ? document.getElementById("field_1_rep_id_no").value : app.field_1_rep_id_no,
    field_2_plant_registry_basic_permit_brewer_no: document.getElementById("field_2_plant_registry_basic_permit_brewer_no") ? document.getElementById("field_2_plant_registry_basic_permit_brewer_no").value : app.field_2_plant_registry_basic_permit_brewer_no,
    field_3_source_of_product: document.getElementById("field_3_source_of_product") ? document.getElementById("field_3_source_of_product").value : app.field_3_source_of_product,
    field_4_serial_number: document.getElementById("field_4_serial_number") ? document.getElementById("field_4_serial_number").value : app.field_4_serial_number,
    field_5_type_of_product: document.getElementById("field_5_type_of_product") ? document.getElementById("field_5_type_of_product").value : app.field_5_type_of_product,
    field_6_brand_name: document.getElementById("field_6_brand_name") ? document.getElementById("field_6_brand_name").value : app.field_6_brand_name,
    field_7_fanciful_name: document.getElementById("field_7_fanciful_name") ? document.getElementById("field_7_fanciful_name").value : app.field_7_fanciful_name,
    field_8_applicant_details: document.getElementById("field_8_applicant_details") ? document.getElementById("field_8_applicant_details").value : app.field_8_applicant_details,
    field_8a_mailing_address: document.getElementById("field_8a_mailing_address") ? document.getElementById("field_8a_mailing_address").value : app.field_8a_mailing_address,
    field_9_formula: document.getElementById("field_9_formula") ? document.getElementById("field_9_formula").value : app.field_9_formula,
    field_10_grape_varietals: document.getElementById("field_10_grape_varietals") ? document.getElementById("field_10_grape_varietals").value : app.field_10_grape_varietals,
    field_11_wine_appellation: document.getElementById("field_11_wine_appellation") ? document.getElementById("field_11_wine_appellation").value : app.field_11_wine_appellation,
    field_12_phone_number: document.getElementById("field_12_phone_number") ? document.getElementById("field_12_phone_number").value : app.field_12_phone_number,
    field_13_email_address: document.getElementById("field_13_email_address") ? document.getElementById("field_13_email_address").value : app.field_13_email_address,
    field_14_type_of_application: document.getElementById("field_14_type_of_application") ? document.getElementById("field_14_type_of_application").value : app.field_14_type_of_application,
    field_15_extra_info: document.getElementById("field_15_extra_info") ? document.getElementById("field_15_extra_info").value : app.field_15_extra_info,
    field_16_date_of_application: document.getElementById("field_16_date_of_application") ? document.getElementById("field_16_date_of_application").value : app.field_16_date_of_application,
    field_17_signature: document.getElementById("field_17_signature") ? document.getElementById("field_17_signature").value : app.field_17_signature,
    field_18_printed_name: document.getElementById("field_18_printed_name") ? document.getElementById("field_18_printed_name").value : app.field_18_printed_name,
    field_government_warning: document.getElementById("field_government_warning") ? document.getElementById("field_government_warning").value : app.field_government_warning,
    field_12_net_contents: app.field_12_net_contents || app.net_contents || "",
    field_13_alcohol_content: app.field_13_alcohol_content || app.abv || "",
    field_15_wine_vintage_date: app.field_15_wine_vintage_date || app.vintage || ""
  };

  const report = Validator.validateApplication(currentFormData);

  // 1. Evaluate optical quality metric for Clarity Circuit Breaker short-circuit
  let isCircuitBreakerTriggered = false;
  let minClarityScore = 100;
  if (app.extracted_assets) {
    app.extracted_assets.forEach((asset) => {
      if (asset.transcription_quality_summary) {
        const score = asset.transcription_quality_summary.global_clarity_score;
        if (score !== undefined && score < minClarityScore) {
          minClarityScore = score;
        }
        if (score < 85 || asset.transcription_quality_summary.hallucination_override_active === true) {
          isCircuitBreakerTriggered = true;
        }
      }
    });
  }

  // Find Panel 3's main header banner
  const panelHeader = document.querySelector(".panel-form .panel-header");
  // Find caution banner
  const cautionBanner = document.getElementById("circuit-breaker-banner");
  // Find override checkbox container
  const overrideContainer = document.getElementById("override-container");
  const overrideCheckbox = document.getElementById("override-clarity-checkbox");
  const isOverridden = overrideCheckbox ? overrideCheckbox.checked : false;
  const btnApprove = document.getElementById("btn-approve");

  if (isCircuitBreakerTriggered) {
    // Force Panel 3's main header banner into warning state
    if (panelHeader) {
      panelHeader.classList.add("warning-state");
    }

    // Render caution warning banner at top of workspace
    if (cautionBanner) {
      cautionBanner.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; flex-shrink: 0;">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>CAUTION: Low Optical Quality Matrix Detected (Clarity Score: ${minClarityScore}%). Automated verification bypassed. Enforcing Human-in-the-Loop Manual Audit.</span>
      `;
      cautionBanner.style.display = "flex";
    }

    // Lock Approve button unless Override checkbox is explicitly checked
    if (overrideContainer) {
      overrideContainer.style.display = "flex";
    }
    if (btnApprove) {
      btnApprove.disabled = !isOverridden;
    }

    // Force Panel 1's active triage item accent border to WARN status
    const currentTriageItem = document.querySelector(`.triage-item[data-index="${currentAppIndex}"]`);
    if (currentTriageItem) {
      currentTriageItem.classList.remove("status-autopass", "status-fail");
      currentTriageItem.classList.add("status-warn");
    }
  } else {
    // Reset warning states
    if (panelHeader) {
      panelHeader.classList.remove("warning-state");
    }
    if (cautionBanner) {
      cautionBanner.style.display = "none";
    }
    if (overrideContainer) {
      overrideContainer.style.display = "none";
    }
    if (overrideCheckbox) {
      overrideCheckbox.checked = false;
    }
    if (btnApprove) {
      btnApprove.disabled = false;
    }

    const currentTriageItem = document.querySelector(`.triage-item[data-index="${currentAppIndex}"]`);
    if (currentTriageItem) {
      currentTriageItem.classList.remove("status-warn");
      currentTriageItem.classList.add(`status-${app.status.toLowerCase()}`);
    }
  }

  // Apply visual styling flags based on outcomes
  for (const [fieldId, result] of Object.entries(report.fields)) {
    const wrapper = document.querySelector(`.form-field[data-field-id="${fieldId}"]`);
    if (wrapper) {
      wrapper.classList.remove("validation-pass", "validation-fail");

      // Remove any existing badge first to prevent duplicates
      const oldBadge = wrapper.querySelector(".field-validation-badge");
      if (oldBadge) oldBadge.remove();

      const badge = document.createElement("span");
      badge.className = "field-validation-badge";
      badge.style.fontSize = "0.65rem";
      badge.style.fontWeight = "700";
      badge.style.padding = "2px 6px";
      badge.style.borderRadius = "4px";
      badge.style.marginLeft = "8px";
      badge.style.display = "inline-block";
      badge.style.letterSpacing = "0.5px";
      badge.style.textTransform = "uppercase";

      if (result.status === "PASS") {
        // Override any 'green' passing states computed by regex if circuit breaker is triggered
        if (!isCircuitBreakerTriggered) {
          wrapper.classList.add("validation-pass");
          badge.textContent = "MATCH";
          badge.style.color = "var(--status-pass)";
          badge.style.backgroundColor = "var(--status-pass-bg)";
          badge.style.border = "1px solid rgba(16, 185, 129, 0.2)";
        } else {
          badge.textContent = "WARN";
          badge.style.color = "var(--status-warn)";
          badge.style.backgroundColor = "var(--status-warn-bg)";
          badge.style.border = "1px solid rgba(245, 158, 11, 0.2)";
        }
        wrapper.removeAttribute("data-validation-message");
      } else {
        wrapper.classList.add("validation-fail");
        badge.textContent = "MISMATCH";
        badge.style.color = "var(--status-fail)";
        badge.style.backgroundColor = "var(--status-fail-bg)";
        badge.style.border = "1px solid rgba(239, 68, 68, 0.2)";
        wrapper.setAttribute("data-validation-message", result.message);
      }

      const label = wrapper.querySelector("label");
      if (label) {
        label.appendChild(badge);
      }
    }
  }
}

function showValidationTooltip(element, message) {
  hideValidationTooltip();

  const tooltip = document.createElement("div");
  tooltip.className = "validation-tooltip";
  tooltip.style.position = "absolute";
  tooltip.style.zIndex = "2000";
  tooltip.style.backgroundColor = "rgba(239, 68, 68, 0.95)";
  tooltip.style.color = "#ffffff";
  tooltip.style.border = "1px solid var(--status-fail)";
  tooltip.style.padding = "8px 12px";
  tooltip.style.borderRadius = "4px";
  tooltip.style.fontSize = "0.75rem";
  tooltip.style.pointerEvents = "none";
  tooltip.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)";
  tooltip.style.maxWidth = "280px";
  tooltip.textContent = message;

  document.body.appendChild(tooltip);
  validationTooltip = tooltip;

  const rect = element.getBoundingClientRect();
  tooltip.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
  tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 8}px`;
}

function hideValidationTooltip() {
  if (validationTooltip) {
    validationTooltip.remove();
    validationTooltip = null;
  }
}

function setupEventListeners() {
  // Search bar listener
  triageSearch.addEventListener("input", () => {
    renderTriageList();
  });

  // Filter tabs listeners
  filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      filterTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      activeFilter = tab.dataset.filter;
      renderTriageList();
    });
  });

  // Carousel slider listeners
  carouselPrev.addEventListener("click", () => {
    navigateCarousel(-1);
  });

  carouselNext.addEventListener("click", () => {
    navigateCarousel(1);
  });

  // Highlight bounding boxes when form fields are focused
  const inputs = complianceForm.querySelectorAll("input, select, textarea");
  inputs.forEach((input) => {
    const parentField = input.closest(".form-field");
    if (!parentField) return;

    const fieldId = parentField.dataset.fieldId;

    input.addEventListener("focus", () => {
      // Find if bounding box exists on currently loaded label asset
      let targetBox = coordinateOverlay.querySelector(`[data-field-id="${fieldId}"]`);

      // Auto-Carousel-Switch: If box is on another label, flip to it
      if (!targetBox) {
        switchToLabelWithField(fieldId);
        targetBox = coordinateOverlay.querySelector(`[data-field-id="${fieldId}"]`);
      }

      if (targetBox) {
        targetBox.classList.add("active");
        // Scroll label display to bring highlighted coordinate bounds center
        targetBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });

    input.addEventListener("blur", () => {
      const targetBox = coordinateOverlay.querySelector(`[data-field-id="${fieldId}"]`);
      if (targetBox) {
        targetBox.classList.remove("active");
      }
    });

    // Real-time re-validation on keypress/change
    input.addEventListener("input", () => {
      executeValidationPipeline();
    });
    input.addEventListener("change", () => {
      executeValidationPipeline();
    });
  });

  // Hover validation tooltip triggers for form fields
  document.querySelectorAll(".form-field").forEach((field) => {
    field.addEventListener("mouseenter", () => {
      if (field.classList.contains("validation-fail")) {
        const msg = field.getAttribute("data-validation-message");
        if (msg) {
          showValidationTooltip(field, msg);
        }
      }
    });

    field.addEventListener("mouseleave", () => {
      hideValidationTooltip();
    });
  });

  // Administrative actions listeners
  btnApprove.addEventListener("click", () => {
    const app = MOCK_APPLICATIONS[currentAppIndex];
    showToast(`Application ${app.ttb_application_id} Approved. Certification record pushed to registry.`, "success");
    updateAppStatus(currentAppIndex, "AUTO_PASS");
  });

  btnCorrect.addEventListener("click", () => {
    const app = MOCK_APPLICATIONS[currentAppIndex];
    showToast(`Correction request compiled. Compliance notification dispatched to ${app.email}.`, "warning");
    updateAppStatus(currentAppIndex, "WARN");
  });

  btnReject.addEventListener("click", () => {
    const app = MOCK_APPLICATIONS[currentAppIndex];
    showToast(`Application ${app.ttb_application_id} Rejected. Disapproval manifest logged.`, "error");
    updateAppStatus(currentAppIndex, "FAIL");
  });

  // Override Clarity Checkbox Change Listener
  const overrideCheckbox = document.getElementById("override-clarity-checkbox");
  if (overrideCheckbox) {
    overrideCheckbox.addEventListener("change", () => {
      executeValidationPipeline();
    });
  }

  // Simulate 429 Throttle Button Click Listener
  const btnTrigger429 = document.getElementById("btn-trigger-429");
  if (btnTrigger429) {
    btnTrigger429.addEventListener("click", () => {
      simulateEndpointCall();
    });
  }

  // Upload Label Assets Button Click Listener
  const btnUploadAssets = document.getElementById("btn-upload-assets");
  const inputUploadAssets = document.getElementById("input-upload-assets");
  if (btnUploadAssets && inputUploadAssets) {
    btnUploadAssets.addEventListener("click", () => {
      inputUploadAssets.click();
    });

    inputUploadAssets.addEventListener('change', async function (e) {
      const imageFiles = e.target.files;
      if (!imageFiles || imageFiles.length === 0) return;

      console.log("Diagnostic: Initializing asset batch process for", imageFiles.length, "items.");

      const filesArray = Array.from(imageFiles);
      const sleep = ms => new Promise(res => setTimeout(res, ms));
      const isRateLimited = filesArray.length >= 3;

      for (let i = 0; i < filesArray.length; i++) {
        const currentImgFile = filesArray[i];
        if (!currentImgFile) continue;

        if (i > 0 && isRateLimited) {
          showToast(`Waiting 4 seconds to respect AI Studio rate limits before uploading ${currentImgFile.name}...`, "info");
          await sleep(4000);
        }

        await new Promise((resolve) => {
          // Extract base prefix by stripping extension and standardizing dashes/spaces,
          // then stripping layout indicators like front, back, neck
          let basePrefix = currentImgFile.name ? currentImgFile.name.toLowerCase() : "";
          // Strip extension
          basePrefix = basePrefix.substring(0, basePrefix.lastIndexOf('.')) || basePrefix;
          // Normalize en-dash, em-dash, and spaces to standard hyphens/spaces
          basePrefix = basePrefix.replace(/[\u2013\u2014]/g, "-");
          // Strip any trailing layout type indicators (front, back, neck) and anything after them
          basePrefix = basePrefix.replace(/[-_\s]+(front|back|neck).*$/i, "");
          // Trim any leftover spaces or hyphens
          basePrefix = basePrefix.trim().replace(/[-_\s]+$/, "");

          console.log("Diagnostic: Isolated tracking prefix match:", basePrefix);

          // Find existing entry or forge a new content record container safely
          const cleanCompare = (str) => {
            if (!str) return "";
            return String(str).toLowerCase().replace(/[^a-z0-9]/g, "");
          };
          const cPrefix = cleanCompare(basePrefix);

          let activeApp = MOCK_APPLICATIONS.find(app => {
            const cId = cleanCompare(app.id);
            const cTracking = cleanCompare(app.base_tracking_prefix);
            const cBrand = cleanCompare(app.brand_name || app.field_6_brand_name);
            const cFanciful = cleanCompare(app.fanciful_name || app.field_7_fanciful_name);

            if (!cPrefix) return false;

            // Match by ID / tracking prefix
            if (cId === cPrefix || cTracking === cPrefix) return true;

            // Match if brand name matches or contains basePrefix, or basePrefix contains brand name
            if (cBrand && (cBrand.includes(cPrefix) || cPrefix.includes(cBrand))) return true;

            // Match if fanciful/product name matches or contains basePrefix, or basePrefix contains fanciful name
            if (cFanciful && (cFanciful.includes(cPrefix) || cPrefix.includes(cFanciful))) return true;

            return false;
          });

          if (!activeApp) {
            activeApp = {
              id: basePrefix,
              ttb_id: "PENDING_LIVE_EXTRACT",
              ttb_application_id: basePrefix,
              base_tracking_prefix: basePrefix,
              brand_name: basePrefix.toUpperCase(),
              field_6_brand_name: "[Extracting...]",
              title: basePrefix.toUpperCase(),
              status: "STANDBY",
              is_orphan: true,
              extracted_assets: [],
              part_1_application: {
                field_6_brand_name: "[Extracting...]",
                field_7_fanciful_name: ""
              }
            };
            MOCK_APPLICATIONS.push(activeApp);
          } else {
            activeApp.is_orphan = true;
          }

          renderTriageList();

          const reader = new FileReader();
          reader.onload = function (event) {
            const base64String = event.target.result;

            // Infer image layout placement from name markers safely using our captured file scope context
            let inferredType = "FRONT";
            const lowerName = currentImgFile.name.toLowerCase();
            if (lowerName.includes("back")) inferredType = "BACK";
            if (lowerName.includes("neck")) inferredType = "NECK";

            // Build out local image carousel asset instance structure using standard keys
            activeApp.extracted_assets.push({
              asset_id: inferredType + "_" + Date.now(),
              label_type: inferredType,
              image_url: base64String, // Synchronized viewport preview canvas property name
              local_image_data: base64String, // Ensure SVG viewport canvas renders image
              dimensions: { width_pixels: 1200, height_pixels: 1400 },
              transcription_quality_summary: {
                global_clarity_score: 95,
                hallucination_override_active: false
              },
              latency_ms: null,
              field_mappings: []
            });

            // Snapshot current array positions bound securely to this specific file stream lifecycle loop
            const thisLabelIndex = activeApp.extracted_assets.length - 1;
            const thisAppIndex = MOCK_APPLICATIONS.indexOf(activeApp);

            // Load image element asynchronously to read actual natural dimensions
            const img = new Image();
            img.onload = function () {
              if (activeApp.extracted_assets[thisLabelIndex]) {
                activeApp.extracted_assets[thisLabelIndex].dimensions = {
                  width_pixels: img.naturalWidth || 1200,
                  height_pixels: img.naturalHeight || 1400
                };
                // Redraw with correct dimensions and bounds mapping once dimensions are resolved
                if (currentAppIndex === thisAppIndex && currentLabelIndex === thisLabelIndex) {
                  loadApplication(currentAppIndex);
                }
              }
            };
            img.src = base64String;

            // Force global pointer arrays to snap focus to this new card instantly so it draws local images right away
            currentAppIndex = thisAppIndex;
            currentLabelIndex = thisLabelIndex;

            renderTriageList();
            loadApplication(currentAppIndex);

            console.log(`Diagnostic: Dispatching payload context for label index ${thisLabelIndex}: ${currentImgFile.name}`);

            const startTime = performance.now();

            // Fire the remote Cloudflare Worker network pipeline call
            fetch(UPLOAD_ENDPOINT, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ttb_application_id: activeApp.ttb_application_id || "ORPHAN_INGEST_" + Date.now(),
                images: [
                  {
                    label_type: inferredType,
                    filename: currentImgFile.name, // Secure scope alignment mapping
                    data: base64String
                  }
                ]
              })
            })
              .then(res => {
                if (!res.ok) throw new Error("HTTP connection drop alert status code: " + res.status);
                return res.json();
              })
              .then(data => {
                const latency = Math.round(performance.now() - startTime);
                if (activeApp.extracted_assets[thisLabelIndex]) {
                  activeApp.extracted_assets[thisLabelIndex].latency_ms = latency;
                }

                console.log(`Diagnostic: Raw AI Studio payload ingested for ${currentImgFile.name}:`, data);

                if (data && data.extracted_assets && Array.isArray(data.extracted_assets)) {
                  let normalizedMappings = [];
                  let foundClarityScore = null;
                  let foundOverride = null;

                  // 1. Check if it's the structured schema where the first item is an asset object with field_mappings
                  const firstAsset = data.extracted_assets[0];
                  if (firstAsset && Array.isArray(firstAsset.field_mappings)) {
                    // Find matching asset or default to the first one
                    const matchedAsset = data.extracted_assets.find(a => a.label_type === inferredType) || firstAsset;
                    
                    if (matchedAsset.transcription_quality_summary) {
                      foundClarityScore = matchedAsset.transcription_quality_summary.global_clarity_score;
                      foundOverride = matchedAsset.transcription_quality_summary.hallucination_override_active;
                    }

                    matchedAsset.field_mappings.forEach(mapping => {
                      const extractedText = mapping.raw_ocr_string || mapping.normalized_text || "";
                      normalizedMappings.push({
                        target_field_id: mapping.target_field_id,
                        bounding_box: {
                          y_min: mapping.bounding_box?.y_min || 0,
                          x_min: mapping.bounding_box?.x_min || 0,
                          y_max: mapping.bounding_box?.y_max || 0,
                          x_max: mapping.bounding_box?.x_max || 0
                        },
                        raw_ocr_string: extractedText,
                        normalized_text: extractedText.toUpperCase(),
                        field_clarity_score: mapping.field_clarity_score || 100
                      });
                    });
                  } else {
                    // 2. Fallback to flat key-value object array shape (supporting multiple keys per object)
                    data.extracted_assets.forEach(item => {
                      Object.keys(item).forEach(fieldId => {
                        if (fieldId === "label_type" || fieldId === "asset_id") return;
                        const details = item[fieldId];
                        if (details && typeof details === 'object') {
                          const extractedText = details.text || details.text_value || details.raw_ocr_string || "";
                          normalizedMappings.push({
                            target_field_id: fieldId,
                            bounding_box: {
                              y_min: details.bounding_box?.y_min || 0,
                              x_min: details.bounding_box?.x_min || 0,
                              y_max: details.bounding_box?.y_max || 0,
                              x_max: details.bounding_box?.x_max || 0
                            },
                            raw_ocr_string: extractedText,
                            normalized_text: extractedText.toUpperCase(),
                            field_clarity_score: details.field_clarity_score || 100
                          });
                        }
                      });
                    });
                  }

                  console.log(`Normalized field mappings generated for SVG canvas (${currentImgFile.name}):`, normalizedMappings);

                  // Apply bounding matrices cleanly to the correct array slot index
                  if (activeApp.extracted_assets[thisLabelIndex]) {
                    activeApp.extracted_assets[thisLabelIndex].field_mappings = normalizedMappings;
                    if (foundClarityScore !== null || foundOverride !== null) {
                      activeApp.extracted_assets[thisLabelIndex].transcription_quality_summary = {
                        global_clarity_score: foundClarityScore !== null ? foundClarityScore : 95,
                        hallucination_override_active: foundOverride !== null ? foundOverride : false
                      };
                    }
                  }

                  // Dynamically assign real text properties to the global application record
                  normalizedMappings.forEach(mapping => {
                    const fId = mapping.target_field_id;
                    const val = mapping.raw_ocr_string;
                    if (!val) return;

                    if (fId === "field_6_brand_name") {
                      activeApp.field_6_brand_name = val;
                      activeApp.brand_name = val;
                      activeApp.title = val.toUpperCase();
                    } else if (fId === "field_7_fanciful_name") {
                      activeApp.field_7_fanciful_name = val;
                      activeApp.fanciful_name = val;
                    } else if (fId === "field_12_net_contents") {
                      activeApp.field_12_net_contents = val;
                      activeApp.net_contents = val;
                    } else if (fId === "field_13_alcohol_content") {
                      activeApp.field_13_alcohol_content = val;
                      activeApp.abv = val;
                    } else if (fId === "field_11_wine_appellation" || fId === "field_14_wine_appellation") {
                      activeApp.field_11_wine_appellation = val;
                      activeApp.appellation = val;
                    } else if (fId === "field_15_wine_vintage" || fId === "field_15_wine_vintage_date") {
                      activeApp.field_15_wine_vintage_date = val;
                      activeApp.vintage = val;
                    } else if (fId === "field_8_applicant_address" || fId === "field_8_applicant_details") {
                      activeApp.field_8_applicant_details = val;
                    } else if (fId === "field_government_warning") {
                      const containsStatutoryKeywords = (txt) => {
                        if (!txt) return false;
                        const upper = txt.toUpperCase();
                        return upper.includes("SURGEON GENERAL") || upper.includes("PREGNANCY") || upper.includes("DISEASE");
                      };
                      const isNewStatutory = containsStatutoryKeywords(val);
                      const isCurrentStatutory = containsStatutoryKeywords(activeApp.field_government_warning);

                      if (isNewStatutory && !isCurrentStatutory) {
                        activeApp.field_government_warning = val;
                      } else if (!isNewStatutory && isCurrentStatutory) {
                        // Keep current statutory warning, ignore the non-statutory new warning
                      } else {
                        // Both are statutory or both are not. Fallback to BACK label or empty check.
                        if (inferredType === "BACK" || !activeApp.field_government_warning) {
                          activeApp.field_government_warning = val;
                        }
                      }
                    }
                  });
                }

                showToast(`AI Studio linked successfully for ${currentImgFile.name}!`, "success");
                renderTriageList();

                // Only trigger full layout redraw if user is still actively looking at this tab split
                if (currentAppIndex === thisAppIndex && currentLabelIndex === thisLabelIndex) {
                  loadApplication(currentAppIndex);
                }
                resolve();
              })
              .catch(err => {
                const latency = Math.round(performance.now() - startTime);
                if (activeApp.extracted_assets[thisLabelIndex]) {
                  activeApp.extracted_assets[thisLabelIndex].latency_ms = latency;
                }
                console.error(`Diagnostic: Pipeline callback failed processing for ${currentImgFile.name}:`, err);
                showToast(`Error parsing application assets schema for ${currentImgFile.name}.`, "error");
                resolve();
              });
          };
          reader.readAsDataURL(currentImgFile);
        });
      }

      // Clear the input selection buffer safely without elements crashing
      e.target.value = '';
    });
  }

  // Upload Form JSON Button Click Listener
  const btnUploadForm = document.getElementById("btn-upload-form");
  const inputUploadForm = document.getElementById("input-upload-form");
  if (btnUploadForm && inputUploadForm) {
    btnUploadForm.addEventListener("click", () => {
      inputUploadForm.click();
    });
    inputUploadForm.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // IMMEDIATELY clear all pre-existing form field properties, match state badges, and dynamic UI variables
      clearFormUI();

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsedData = JSON.parse(event.target.result);
          showToast(`Form 5100.31 JSON configuration parsed successfully.`, "success");

          // Keep user-uploaded extracted assets if any exist in the currently active application,
          // but completely purge default/hardcoded baseline mock data.
          let existingAssets = [];
          const mockIds = ["14345001000326", "15012003001852", "16104001000947"];
          const currentApp = MOCK_APPLICATIONS[currentAppIndex];
          if (currentApp && !mockIds.includes(String(currentApp.ttb_application_id))) {
            existingAssets = currentApp.extracted_assets || [];
          }

          // Do NOT clear MOCK_APPLICATIONS array (Multi-Item Retention Queue)

          const jsonData = parsedData || {};
          const p1 = jsonData.part_1_application || {};
          const p2 = jsonData.part_2_applicants_certification || {};

          // field_1_rep_id_no parsing
          let field1Val = "";
          if (p1.field_1_rep_id_no !== undefined && p1.field_1_rep_id_no !== null) {
            if (typeof p1.field_1_rep_id_no === 'object') {
              field1Val = p1.field_1_rep_id_no.ct !== undefined && p1.field_1_rep_id_no.ct !== null ? String(p1.field_1_rep_id_no.ct) : "";
            } else {
              field1Val = String(p1.field_1_rep_id_no);
            }
          }

          // field_8_applicant_details mapping
          let field8Val = "";
          if (p1.field_8_applicant_details) {
            if (typeof p1.field_8_applicant_details === 'object') {
              const name = p1.field_8_applicant_details.name || "";
              const street = p1.field_8_applicant_details.street || "";
              const cityStateZip = p1.field_8_applicant_details.city_state_zip || "";
              field8Val = [name, street, cityStateZip].filter(Boolean).join("\n");
            } else {
              field8Val = String(p1.field_8_applicant_details);
            }
          }

          const appellationVal = p1.field_11_wine_appellation || p1.field_14_wine_appellation || '';
          const field12PhoneVal = p1.field_12_phone_number || p1.field_16_phone_number || '';

          // field_14_type_of_application configuration flag logic
          let field14TypeVal = "";
          const rawAppType = p1.field_14_type_of_application || p1.field_18_type_of_application;
          if (rawAppType) {
            if (typeof rawAppType === 'object') {
              const truthyKey = Object.keys(rawAppType).find(k => rawAppType[k] === true);
              if (truthyKey) {
                field14TypeVal = "CERTIFICATE OF LABEL APPROVAL";
              } else {
                field14TypeVal = "CERTIFICATE OF LABEL APPROVAL";
              }
            } else {
              field14TypeVal = String(rawAppType);
            }
          }

          const field16DateVal = p2.field_16_date_of_application || '';
          const field18PrintedVal = p2.field_18_print_name || p2.field_18_printed_name || '';

          // Under-the-hood parameters inside the models:
          const netVal = p1.field_12_net_contents || '';
          const alcoholVal = p1.field_13_alcohol_content || '';
          const vintageVal = p1.field_15_wine_vintage_date || '';

          const newAppId = String(jsonData.ttb_id || jsonData.ttb_application_id || ("14" + Date.now().toString().slice(-12)));

          // Multi-Field Matching Reconciliation
          const cleanString = (str) => {
            if (!str) return "";
            return String(str).toLowerCase().replace(/[^a-z0-9]/g, "");
          };
          const stringMatches = (a, b) => {
            const ca = cleanString(a);
            const cb = cleanString(b);
            if (!ca || !cb) return false;
            return ca.includes(cb) || cb.includes(ca);
          };

          const formBrand = p1.field_6_brand_name || '';
          const formFanciful = p1.field_7_fanciful_name || '';
          const formRegistry = p1.field_2_plant_registry_basic_permit_brewer_no || '';

          let matchedRecord = null;
          let matchedRecordIndex = -1;

          for (let i = 0; i < MOCK_APPLICATIONS.length; i++) {
            const app = MOCK_APPLICATIONS[i];
            if (app.is_orphan) {
              let ocrBrand = app.field_6_brand_name || "";
              let ocrFanciful = app.field_7_fanciful_name || "";
              let ocrRegistry = app.field_2_plant_registry_basic_permit_brewer_no || app.registry_no || "";

              if (app.extracted_assets) {
                app.extracted_assets.forEach(asset => {
                  if (asset.field_mappings) {
                    asset.field_mappings.forEach(m => {
                      const fId = m.target_field_id;
                      const text = m.normalized_text || m.raw_ocr_string || "";
                      if (fId === "field_6_brand_name" && !ocrBrand) ocrBrand = text;
                      else if (fId === "field_7_fanciful_name" && !ocrFanciful) ocrFanciful = text;
                      else if ((fId === "field_2_plant_registry_basic_permit_brewer_no" || fId === "field_2_plant_registry") && !ocrRegistry) ocrRegistry = text;
                    });
                  }
                });
              }

              const brandMatch = stringMatches(formBrand, ocrBrand);
              const fancifulMatch = stringMatches(formFanciful, ocrFanciful);
              const registryMatch = stringMatches(formRegistry, ocrRegistry);
              const prefixMatch = stringMatches(formBrand, app.id) || stringMatches(formFanciful, app.id) ||
                                  stringMatches(formBrand, app.base_tracking_prefix) || stringMatches(formFanciful, app.base_tracking_prefix);

              if (brandMatch || fancifulMatch || registryMatch || prefixMatch) {
                matchedRecord = app;
                matchedRecordIndex = i;
                break;
              }
            }
          }

          if (matchedRecord) {
            matchedRecord.is_orphan = false;
            matchedRecord.ttb_application_id = newAppId;
            matchedRecord.ttb_id = newAppId;

            // Merge form properties
            matchedRecord.field_1_rep_id_no = field1Val;
            matchedRecord.field_2_plant_registry_basic_permit_brewer_no = p1.field_2_plant_registry_basic_permit_brewer_no || '';
            matchedRecord.field_3_source_of_product = p1.field_3_source_of_product || 'Domestic';
            matchedRecord.field_4_serial_number = p1.field_4_serial_number || '';
            matchedRecord.field_5_type_of_product = p1.field_5_type_of_product || 'MALT BEVERAGE';
            matchedRecord.field_6_brand_name = p1.field_6_brand_name || '';
            matchedRecord.field_7_fanciful_name = p1.field_7_fanciful_name || '';
            matchedRecord.field_8_applicant_details = field8Val;
            matchedRecord.field_8a_mailing_address = p1.field_8a_mailing_address || '';
            matchedRecord.field_9_formula = p1.field_9_formula || p1.field_18_formula || '';
            matchedRecord.field_10_grape_varietals = p1.field_10_grape_varietals || '';
            matchedRecord.field_11_wine_appellation = appellationVal;
            matchedRecord.field_12_phone_number = field12PhoneVal;
            matchedRecord.field_13_email_address = p1.field_13_email_address || '';
            matchedRecord.field_14_type_of_application = field14TypeVal;
            matchedRecord.field_15_extra_info = p1.field_15_extra_info || '';
            matchedRecord.field_16_date_of_application = field16DateVal;
            matchedRecord.field_17_signature = p2.field_17_signature || 'Signature on file';
            matchedRecord.field_18_printed_name = field18PrintedVal;
            if (p1.field_government_warning) {
              matchedRecord.field_government_warning = p1.field_government_warning;
            }
            matchedRecord.field_12_net_contents = netVal;
            matchedRecord.field_13_alcohol_content = alcoholVal;
            matchedRecord.field_15_wine_vintage_date = vintageVal;

            matchedRecord.brand_name = p1.field_6_brand_name || "";
            matchedRecord.fanciful_name = p1.field_7_fanciful_name || "";
            matchedRecord.registry_no = p1.field_2_plant_registry_basic_permit_brewer_no || "";
            matchedRecord.appellation = appellationVal;
            matchedRecord.vintage = vintageVal;
            matchedRecord.phone = field12PhoneVal;

            currentAppIndex = matchedRecordIndex;
            showToast(`Merged form properties with matching image orphan: ${matchedRecord.brand_name}`, "success");
          } else {
            // Push a new application record normally
            const cleanApp = {
              ttb_application_id: newAppId,
              timestamp: new Date().toISOString(),
              global_processing_time_ms: 100,
              status: "WARN",
              brand_name: p1.field_6_brand_name || "",
              fanciful_name: p1.field_7_fanciful_name || "",
              source: p1.field_3_source_of_product || "Domestic",
              serial_number: p1.field_4_serial_number || "",
              app_type: "COLA",
              class_type: p1.field_5_type_of_product || "MALT BEVERAGE",
              formula: p1.field_9_formula || p1.field_18_formula || "N/A",
              email: p1.field_13_email_address || "compliance@evaluator.gov",
              abv: alcoholVal,
              net_contents: netVal,
              address: field8Val,
              registry_no: p1.field_2_plant_registry_basic_permit_brewer_no || "",
              appellation: appellationVal,
              vintage: vintageVal,
              phone: field12PhoneVal,
              certification: "",
              // Direct master fields mapping
              ttb_id: newAppId,
              field_1_rep_id_no: field1Val,
              field_2_plant_registry_basic_permit_brewer_no: p1.field_2_plant_registry_basic_permit_brewer_no || "",
              field_3_source_of_product: p1.field_3_source_of_product || "Domestic",
              field_4_serial_number: p1.field_4_serial_number || "",
              field_5_type_of_product: p1.field_5_type_of_product || "MALT BEVERAGE",
              field_6_brand_name: p1.field_6_brand_name || "",
              field_7_fanciful_name: p1.field_7_fanciful_name || "",
              field_8_applicant_details: field8Val,
              field_8a_mailing_address: p1.field_8a_mailing_address || "",
              field_9_formula: p1.field_9_formula || p1.field_18_formula || "",
              field_10_grape_varietals: p1.field_10_grape_varietals || "",
              field_11_wine_appellation: appellationVal,
              field_12_phone_number: field12PhoneVal,
              field_13_email_address: p1.field_13_email_address || "",
              field_14_type_of_application: field14TypeVal,
              field_15_extra_info: p1.field_15_extra_info || "",
              field_16_date_of_application: field16DateVal,
              field_17_signature: p2.field_17_signature || "Signature on file",
              field_18_printed_name: field18PrintedVal,
              field_government_warning: p1.field_government_warning || "",
              field_12_net_contents: netVal,
              field_13_alcohol_content: alcoholVal,
              field_15_wine_vintage_date: vintageVal,
              extracted_assets: []
            };
            MOCK_APPLICATIONS.push(cleanApp);
            currentAppIndex = MOCK_APPLICATIONS.length - 1;
          }

          currentLabelIndex = 0;

          // Refresh the sidebar triage list to reflect changes
          renderTriageList();

          // Repaint pass: load application to cleanly populate fields and trigger validation
          loadApplication(currentAppIndex);

        } catch (err) {
          console.error("JSON parse failure:", err);
          showToast("Failed to parse JSON file: " + err.message, "error");
        }
      };
      reader.readAsText(file);
      
      // Clear the input selection buffer safely without elements crashing
      e.target.value = '';
    });
  }

  // Window resize and load listener to adjust coordinate overlay dimensions dynamically
  window.addEventListener("resize", () => {
    const app = MOCK_APPLICATIONS[currentAppIndex];
    if (app && app.extracted_assets) {
      const activeAsset = app.extracted_assets[currentLabelIndex];
      if (activeAsset) {
        resizeCoordinateOverlay();
        drawBoundingBoxes(activeAsset.field_mappings);
      }
    }
  });

  window.addEventListener("load", () => {
    const app = MOCK_APPLICATIONS[currentAppIndex];
    if (app && app.extracted_assets) {
      const activeAsset = app.extracted_assets[currentLabelIndex];
      if (activeAsset) {
        resizeCoordinateOverlay();
        drawBoundingBoxes(activeAsset.field_mappings);
      }
    }
  });
}

// Simulated Rate-Limiting Caller & Boundary Catch
function simulateEndpointCall() {
  showToast("Initiating edge proxy pipeline query...", "warning");

  setTimeout(() => {
    try {
      // Simulate rate limit HTTP 429 response
      throw {
        status: 429,
        message: "Sandbox API Gateway Throttling Intercepted (HTTP 429). Sandbox rate boundaries reached. Production deployment paths use native, unthrottled Azure FedRAMP multi-instance FIFO queuing architectures to handle infinite bulk scale safely."
      };
    } catch (exception) {
      if (exception.status === 429) {
        showToast("Rate limit exceeded!", "error");
        renderThrottleModal(exception.message);
      } else {
        showToast(`Pipeline execution failed: ${exception.message || exception}`, "error");
      }
    }
  }, 600);
}

// Rate Limiting Alert Modal Popup
function renderThrottleModal(message) {
  const existingModal = document.getElementById("throttle-modal");
  if (existingModal) existingModal.remove();

  const modal = document.createElement("div");
  modal.id = "throttle-modal";
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100vw";
  modal.style.height = "100vh";
  modal.style.backgroundColor = "rgba(15, 23, 42, 0.85)";
  modal.style.backdropFilter = "blur(8px)";
  modal.style.display = "flex";
  modal.style.justifyContent = "center";
  modal.style.alignItems = "center";
  modal.style.zIndex = "10000";

  modal.innerHTML = `
    <div style="background-color: var(--bg-panel); border: 1px solid var(--status-fail); border-radius: 8px; padding: 24px; max-width: 480px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.6); display: flex; flex-direction: column; gap: 16px;">
      <div style="display: flex; align-items: center; gap: 10px; color: var(--status-fail); font-weight: 700; font-size: 1.1rem;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px; flex-shrink: 0;">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>Sandbox Limit Boundary Exceeded</span>
      </div>
      <p style="font-size: 0.85rem; line-height: 1.5; color: var(--text-primary); margin: 0;">
        ${message}
      </p>
      <button type="button" id="btn-close-modal" class="btn" style="background-color: var(--status-fail-bg); color: var(--status-fail); border: 1px solid rgba(239,68,68,0.3); align-self: flex-end; font-size: 0.8rem; font-weight: 600; padding: 8px 16px; border-radius: 6px; cursor: pointer; transition: all 0.2s ease;">Acknowledge & Dismiss</button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("btn-close-modal").addEventListener("click", () => {
    modal.remove();
  });
}

// Carousel navigation helper
function navigateCarousel(direction) {
  const app = MOCK_APPLICATIONS[currentAppIndex];
  const assets = app.extracted_assets;
  if (assets.length <= 1) return;

  currentLabelIndex = (currentLabelIndex + direction + assets.length) % assets.length;
  renderActiveLabel();
}

// Flip to corresponding label if focused form field is mapped on another asset
function switchToLabelWithField(fieldId) {
  const app = MOCK_APPLICATIONS[currentAppIndex];

  for (let i = 0; i < app.extracted_assets.length; i++) {
    const asset = app.extracted_assets[i];
    const mapping = asset.field_mappings.find((m) => m.target_field_id === fieldId);

    // Check if mapping exists and is not missing coordinates
    if (mapping && !(mapping.bounding_box.x_min === 0 && mapping.bounding_box.y_min === 0)) {
      if (currentLabelIndex !== i) {
        currentLabelIndex = i;
        renderActiveLabel();
      }
      break;
    }
  }
}

// Update application processing state locally
function updateAppStatus(index, newStatus) {
  MOCK_APPLICATIONS[index].status = newStatus;
  renderTriageList();
}

// Toast Notifications System
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  // Icon configuration
  let svgIcon = "";
  if (type === "success") {
    svgIcon = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
  } else if (type === "warning") {
    svgIcon = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  } else if (type === "error") {
    svgIcon = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  }

  toast.innerHTML = `
    ${svgIcon}
    <span class="toast-text">${message}</span>
  `;

  container.appendChild(toast);

  // Remove toast animations
  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}
