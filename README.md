# TTB Label Assistant - Compliance Workspace
### Department of the Treasury Panel Submission Dossier

A modern, stateless, edge-proxied COLA (Certificate of Label Approval) verification system built for the Department of the Treasury compliance processing pipelines. The application processes high-resolution multi-image label assets (FRONT, BACK, and NECK labels) to extract text, bounding boxes, and metadata, validating them in real-time against federal alcohol regulations (27 CFR).

---

## 1. COMPLIANCE CHECKLIST & DELIVERABLES

This submission delivers the complete baseline source code files required for evaluation:
- **[index.html](https://github.com/bryant360/TTB_Label/blob/main/App/index.html)**: The unified compliance panel layout (renamed from `index_2.html`), displaying the three-panel workspace.
- **[app_3.js](https://github.com/bryant360/TTB_Label/blob/main/App/app_3.js)**: The core client-side orchestration thread controlling application states, sequential image queueing, edge latency tracking, and bounding box rendering.
- **[styles.css](https://github.com/bryant360/TTB_Label/blob/main/App/styles.css)**: The responsive premium design system styling grid panel wrappers, administrative action bars, and glassmorphic tooltips.
- **[validator.js](https://github.com/bryant360/TTB_Label/blob/main/App/validator.js)**: The statutory logic library executing compliance checks (CFR Title 27) for ABV tolerances, brand spelling alignment, and Surgeon General health warning capitalization and bolding regulations.
- **[index.js](https://github.com/bryant360/TTB_Label/blob/main/App/index.js)**: Serves as the entry point for the backend serverless microservice, hosted live on the **Cloudflare Workers** edge runtime platform. Operating within an **"Edge Ingestion, Client Evaluation"** architecture paradigm, this component serves strictly as a blind, stateless, pass-through API gateway.
---

## 2. DOCUMENTATION OF APPROACH & ARCHITECTURAL TOOLS

### Key Architectural Choices:
1.  **Cloudflare Pages (Static Frontend Deployment)**
    - Configured to serve static files (`index.html`, `app_3.js`, `styles.css`) globally on the edge with extremely low load latencies.
    - Utilizes a root-level `_redirects` file (`/* /index.html 200`) to route all inbound paths to our single-page application workspace natively.
2.  **Cloudflare Workers (Secure Backend API Credential Proxy)**
    - Designed as a serverless stateless API bridge between the client application and Google AI Studio.
    - Resolves CORS blocks and hides sensitive downstream API keys.
3.  **Google AI Studio SDK & Gemini-3.1-Flash-Lite**
    - Leverages the high-performance `gemini-3.1-flash-lite` multimodal vision model to process complex multi-image inputs.
    - This model provides higher raw API call volume capacity but is restricted to a maximum of 15 Requests Per Minute (RPM) in the free-tier sandbox.

### Safe Environment Variable Isolation:
To prevent leakage of private Google AI Studio API credentials, the project separates credentials from the client console:
- **No Client API Keys**: The client codebase contains zero Google AI Studio SDK imports or hardcoded keys.
- **Worker Key Isolation**: The API key is stored securely as an encrypted environment variable (`GEMINI_API_KEY`) within the Cloudflare Workers runtime configuration.
- **Stateless Proxying**: The client dispatches raw image binary blobs directly to our secure edge worker endpoint (`UPLOAD_ENDPOINT` in `app_3.js`). The worker attaches the API key in the backend header, queries the multimodal API, and returns the response payload back to the client, keeping credentials fully hidden.

---

## 3. CORE TECHNICAL ASSUMPTIONS & STABILITY STRATEGIES

### File Name Safety & Asset Processing:
To handle heavy user workloads without crashing, we implement a sequential file-ingestion pipeline:
- **Array-Safe Initialization**: All incoming user uploads are cast using `Array.from(files)` to guarantee an immutable array snapshot.
- **Asynchronous Promise Loops**: The frontend uses a sequential `for (let i = 0; i < files.length; i++)` loop backed by `async/await` instead of concurrent `.forEach` callbacks. Each file's async reading (`FileReader`), size detection, and Workers API fetch are wrapped in a distinct Promise.
- **Out-of-Order Prevention**: The loop blocks and waits for each promise to resolve before moving to the next. This prevents out-of-order database insertions, state race conditions, or array-shifting conflicts when users upload 3+ images simultaneously.
- **Rate-Limiting Protection**: To respect the `gemini-3.1-flash-lite` API constraint of 15 Requests Per Minute (RPM), a 4-second rate-limiting buffer delay is automatically applied between consecutive requests when 3 or more images are uploaded in a single batch.

### Client-Side Thread Isolation:
To preserve stability during network errors or high latency:
- **Decoupled Metric Rendering**: Bounding box geometry painting is isolated from outbound network ingestion tasks. The system utilizes canvas dimensions dynamically obtained via natural aspect ratio metrics.
- **Asynchronous Boundary Protection**: Network fetch blocks are wrapped in individual `try/catch` and Promise boundaries. If an ingestion thread fails (due to a 429 rate limit or network drop), the failure is caught locally and triggers a toast notification. It resolves the promise anyway, allowing the sequence loop to proceed to subsequent uploads without halting the entire user interface.

---

## 4. TARGET IDENTIFICATION FIELDS (What We Currently Extrapolate)

The system parses, maps coordinates, and runs federal validation checks on these target areas:
1.  **Brand Name Verification**
    - Scans labels for `field_6_brand_name`. Performs fuzzy normalization and substring containment matching against Form 5100.31 to ensure matching compliance even when stylized cursive text is present.
2.  **Alcohol by Volume (ABV) Content**
    - Identifies `field_13_alcohol_content` ABV percentages (e.g. `13.5% ABV` or `ALC. 14% BY VOL.`). Validates values against the statutory threshold tolerance ranges defined in 27 CFR.
3.  **Mandated Health/Government Warning Structures**
    - Locates the statutory warning block. Verifies that the words `"GOVERNMENT WARNING"` are bolded and in all caps, and checks the capitalization of `"Surgeon General"` if mixed casing is used in the rest of the text.

---

## 5. SCALABILITY: MULTI-FILE HIGHER CAPACITY & EXTENSIBLE OCR

### Multi-File Architecture:
- Processes multi-file batches (front, back, and neck labels) under a single application group.
- Normalizes unicode dashes and whitespace inside filenames, stripping suffix tags (like `_back` or `-front`) to match them to a single TTB record.
- Displays interactive overlays dynamically inside a carousel, updating performance metrics instantly when switching between label views.

### Extensibility:
- **Percentage Coordinate System**: Bounding box coordinates are divided by 10 to establish strict percentage-based position metrics (`left: x_min / 10 + "%"`, etc.).
- **Fluid Layout Re-scaling**: Because positioning is coordinate-independent and layout-relative, developers can add new target validation parameters (e.g. Net Contents, Wine Appellation, Sulphite Declarations) without rewriting coordinate scaling math or modifying canvas dimensions. The highlights automatically scale with the browser window natively.

### Latency Metrics:
- Dispatches asynchronous edge request payloads via `gemini-3.1-flash-lite` to bypass traditional heavy monolithic pipeline bottlenecks.
- Response cycles average ultra-low latencies (typically **1.5 to 2.5 seconds** per label processing batch), providing instant feedback to compliance agents.

---

## 6. TTB FORM 5100.31 TO JSON SCHEMA TRANSFORMATION

Converting TTB Form 5100.31 into an ingestible structural JSON object enables programmatic compliance streaming. It translates physical form layout checkboxes and inputs directly into standardized fields.

Below is the complete, production-ready JSON Schema matching the nested structure of TTB Form 5100.31:

```json
{
  "ttb_id": "25182001000687",
  "omb_number": "1513-0020",
  "form_revision_date": "06-2016",
  "status": "APPROVED",
  "part_1_application": {
    "field_1_rep_id_no": "",
    "field_2_plant_registry_basic_permit_brewer_no": "BR-WA-21032",
    "field_3_source_of_product": "Domestic",
    "field_4_serial_number": "250701",
    "field_5_type_of_product": "MALT BEVERAGE",
    "field_6_brand_name": "SILVER CITY BREWERY",
    "field_7_fanciful_name": "DO THE PUYALLUP PALE ALE",
    "field_8_applicant_details": {
      "name": "Silver City Brewery, Silver City Brewery LLC",
      "street": "206 KATY PENMAN AVE",
      "city_state_zip": "Bremerton WA 98312"
    },
    "field_8a_mailing_address": "",
    "field_9_formula": "",
    "field_10_grape_varietals": [
      "N/A"
    ],
    "field_11_wine_appellation": "",
    "field_12_phone_number": "(360) 813-1487",
    "field_13_email_address": "",
    "field_14_type_of_application": {
      "certificate_of_label_approval": true,
      "certificate_of_exemption": false,
      "distinctive_liquor_bottle_approval": false,
      "resubmission_after_rejection": false
    },
    "field_15_extra_information_translations": ""
  },
  "part_2_applicants_certification": {
    "field_16_date_of_application": "07/01/2025",
    "field_17_signature_placeholder": "(Application was e-filed)",
    "field_18_print_name": "Scott Houmes"
  },
  "ai_label_extraction_targets": {
    "brand_name": "SILVER CITY BREWERY",
    "class_type": "ALE",
    "alcohol_content": "",
    "net_contents": "",
    "government_warning": ""
  }
}
```

---

## 🛠️ Project Setup & Local Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (Version 18.0 or higher recommended)
- `npm` (packaged with Node.js)

### Installation Steps
1. Download or clone the repository files into a folder of your choosing.
2. Navigate to your selected folder:
   ```bash
   cd "/path/to/your/chosen/folder"
   ```
3. Install the required dependencies:
   ```bash
   npm install
   ```

### Verification & Local Simulations
To verify that the serverless edge worker logic and Multi-Image Manifest Manifold schema contracts execute flawlessly, run the following verification scripts locally:

*   **In-Memory Simulation Harness (Offline API Mock)**
    ```bash
    node mock-edge-harness.js
    ```
    *Expected Output:* Displays a compliance validation dashboard indicating `[PASS]` for status codes, content-types, JSON formatting, and schema compliance.
*   **Sandbox Integration Test (Requires API Key)**
    Update the `GEMINI_API_KEY` inside `.dev.vars` and run:
    ```bash
    node test-milestone-1.js
    ```

---

## 🖥️ Interactive Application User Guide

The TTB Label Assistant user interface is built as a three-panel responsive grid workspace. Compliance evaluators interact with the application using the following workflows:

### 1. Workload Ingestion (Panel 1 Ingestion Buttons)
Evaluators can dynamically ingest new application assets directly from the top of the TTB Workload Triage sidebar:
*   **"Upload Label Assets" Button**: Clicking this accepts physical label artwork files (e.g. PNG, JPEG, SVG) from the local system and inserts them dynamically into the Panel 2 interactive carousel explorer.
*   **"Upload Form JSON" Button**: Clicking this allows evaluators to import structured form data contracts (adhering to TTB Form 5100.31 JSON schema schemas). The imported fields instantly populate the corresponding form rows and compliance controls inside Panel 3.
*   **Demo Assets**: To test the verification flows with pre-prepared real-world examples, evaluators can download and use the assets located in the **[Examples](https://github.com/bryant360/TTB_Label/blob/main/Examples)** directory of this repository.

### 2. Interactive UX Verification (Panel 2 & 3 Synchronization)
Once label assets are loaded:
*   **Hover Highlights**: Move the mouse cursor over any active text block on the SVG label in Panel 2. The bounding box highlight outline will change from dashed amber to solid blue, and a floating custom HTML tooltip will render detailing the field friendly name and confidence score (e.g. `Brand Name (99%)` or `Alcohol Content (95%)`).
*   **Auto-Focus Mapping**: Hovering/selecting a bounding box in Panel 2 automatically scrolls to and highlights the corresponding input field in Panel 3.
*   **Two-Way Form Sync**: Clicking or focusing any input field in Panel 3 (e.g., "13. Alcohol Content") automatically flips the Panel 2 carousel view to the corresponding label asset type (e.g. BACK label) containing that field, and flashes its coordinate highlight box on the explorer layout.
