# TTB Stakeholder Concerns & Strategic Requirements Matrix

This document provides a comprehensive analysis of the core operational and security anxieties voiced by key personnel within the Compliance and IT Divisions of the Alcohol and Tobacco Tax and Trade Bureau (TTB)[cite: 3658]. It details how the "Edge Ingestion, Client Evaluation" computational paradigm architecture directly answers each concern across the implementation phases of the **TTB Label Verification Assistant**[cite: 3307, 3413, 3599].

---

## 1. Stakeholder Context & Core Concerns

### 👩‍💼 Sarah Chen — Deputy Director of Label Compliance
* **Operational Reality:** The TTB reviews approximately **150,000 label applications annually** with a severely restricted workforce of **only 47 agents**[cite: 3393, 3661].
* **The Bottleneck:** Agents spend more than half of their working hours performing routine data entry and manual pattern matching (e.g., verifying that data written on Form 5100.31 exactly matches physical text printed on label artwork)[cite: 3327, 3665, 3667].
* **Core Anxiety (The 5-Second SLA):** A previous scanning vendor pilot failed catastrophically because it required 30 to 40 seconds to process a single label[cite: 3669, 3670]. Agents abandoned the tool because they could process five labels by eye in that time[cite: 3671]. **If a tool cannot return reliable extraction results within ~5 seconds, adoption will be zero**[cite: 3672].
* **Strategic Desires:** Needs a high-throughput solution that streamlines peak-season batch arrivals, where large importers dump 200–300 applications at a single moment[cite: 3678, 3680].

### 👨‍💻 Marcus Williams — IT Systems Administrator
* **Operational Reality:** The TTB infrastructure operates on a legacy environment migrated to Azure in 2019, bound by an intensive 18-month FedRAMP certification process[cite: 3684, 3685]. The core COLAs Online system is built on a legacy .NET stack that would cost an estimated $4.2M to fully rebuild[cite: 3685, 3686].
* **Core Anxieties:** Unpredictable consumption-based cloud auto-scaling costs, rigid firewalls that block outbound traffic to external ML endpoints, and severe Personally Identifiable Information (PII) data retention compliance liabilities[cite: 3395, 3690, 3692, 3693].
* **Strategic Desires:** Requires a standalone proof-of-concept (PoC) that demands zero server-side maintenance costs, exposes no data storage footprint, and can run completely safely within a tightly monitored government network sandbox[cite: 3308, 3421, 3688, 3691].

### 👴 Dave Morrison — Senior Compliance Agent (28 Years Experience)
* **Operational Reality:** Represents the veteran workforce (over 50% of the active division staff) who are highly skeptical of automation tools that introduce complicated interface layouts, hidden menus, or heavy manual click patterns[cite: 3396, 3397, 3674, 3677].
* **Core Anxieties:** Automated systems lack transparency, often causing "black-box" decisions that strip agents of technical judgments[cite: 3397]. Tooling can introduce false negatives due to minor character case changes (e.g., matching "STONE'S THROW" in all-caps vs. "Stone's Throw" in title-case)[cite: 3694].
* **Strategic Desires:** A simple interface that preserves human judgment, requires zero "hunting for buttons," and provides clear, immediate explainability for every automated pass or fail status[cite: 3397, 3677, 3695].

### 👩‍🎓 Jenny Park — Junior Compliance Agent (8 Months Experience)
* **Operational Reality:** Represents the digital-native tier of workers who currently rely on physical, printed paper checklists kept on their desks to verify subtle label legal complexities[cite: 3398, 3698].
* **Core Anxieties:** Missing exact, word-for-word legal mandates that are difficult for human eyes to track continuously[cite: 3399]. For example, ensuring the Federal Government Health Warning statement contains exact punctuation, capitalization (the introductory `"GOVERNMENT WARNING:"` prefix must be in bold all-caps), and literal character matches[cite: 3399, 3700, 3701].
* **Strategic Desires:** Immediate, automated visual highlights that direct attention to subtle non-compliance tricks, and a vision engine that handles messy real-world imagery (bad lighting, glare, or skewed angles)[cite: 3405, 3704, 3705].

---

## 2. Structural Requirements Matrix & Architectural Solutions

The table below outlines how specific engineering choices in **Phase 1 (Active Code)** and **Phase 2/3 (Roadmap Blueprinting)** directly mitigate each stakeholder's core anxieties[cite: 3306, 3376].

| Stakeholder | Core Concern / Vulnerability | Architectural Solution & Implementation Phase | Technical Mechanism |
| :--- | :--- | :--- | :--- |
| **Sarah Chen** | Processing Latency Blockers (>30s) [cite: 3670] | **Phase 1 (Active Code)**<br>Frontier Flash Model Selection [cite: 4022] | Leveraging `gemini-3.5-flash` natively over standard, optimized REST API tunnels directly from the client or minimal edge workers[cite: 3150, 4026, 4027]. It bypasses heavy monolithic SDK layers and completes text/coordinate extraction under a **1.5 to 2.5-second processing window**, easily clearing the 5-second SLA barrier[cite: 3150, 3591, 3672, 4023]. |
| **Sarah Chen** | High-Volume Peak Batch Surges [cite: 3678] | **Phase 2/3 (README Roadmap)**<br>Asynchronous FIFO Cost-Protection Queues [cite: 3365, 3635] | Incorporating an Azure FedRAMP-compliant FIFO queue mechanism[cite: 3365, 3639]. Instead of scaling up expensive compute instances during importer dumps (200–300 files), the queue safely absorbs the load and processes items sequentially at a predictable steady-state throughput, insulating the sandbox tier from HTTP 429 rate limit exceptions[cite: 3366, 3636, 3637, 3678]. |
| **Marcus Williams** | Infrastructure & Maintenance Budget Caps [cite: 3395] | **Phase 1 (Active Code)**<br>"Edge Ingestion, Client Evaluation" Paradigm [cite: 3307, 3413] | Shifting 100% of the deterministic regular expression rule-matching matrices into the client browser context (`src/validator.js`)[cite: 3315, 3316, 3388, 3420]. The Cloudflare Worker proxy (`src/index.js`) handles pass-through routing in less than **1–2 ms of CPU execution time**, keeping cloud resource overhead strictly at **zero cost** and bypassing Cloudflare's free 10ms execution limit[cite: 3311, 3312, 3414, 3418, 3421]. |
| **Marcus Williams** | Outbound Firewall & Security Blocks [cite: 3692] | **Phase 1 (Active Code)**<br>Decoupled Environment Key Vaults [cite: 3337] | Encrypting and injecting the Google AI Studio API credential directly inside Cloudflare's hardware-isolated edge vault (`secret_put`)[cite: 2892, 3341, 3766]. Outbound requests to model clusters flow securely over edge hardware without exposing tokens to the client-side code, while local sandboxing utilizes a git-hidden `.dev.vars` file to secure active development branches[cite: 3339, 3342, 3764]. |
| **Marcus Williams** | Federal PII & Storage Liabilities [cite: 3690] | **Phase 1 (Active Code)**<br>Stateless Ephemeral Data Pipeline [cite: 3422] | Uploaded multi-image streams are processed entirely in-memory using RAM buffer objects[cite: 3312, 3629]. The serverless proxy never decodes, caches, or writes raw image bytes or extracted JSON parameters to permanent server directories or disks, establishing an ironclad ephemeral lifecycle that completely evades data retention compliance liabilities[cite: 3422, 3423, 3629]. |
| **Dave Morrison** | UI Over-complication & Button Hunting [cite: 3397, 3677] | **Phase 1 (Active Code)**<br>Three-Panel Triage Layout [cite: 3400] | The layout is built using a highly responsive, explicit grid optimized for standard, low-resolution government displays (22" or 24")[cite: 3400, 3604]. Features a skinny far-left workload triage sidebar (Panel 1) [cite: 3320, 3604], an uncluttered center carousel (Panel 2) with a prominent on/off overlay toggle [cite: 3324, 3608, 3609], and a familiar right-hand electronic form component (Panel 3)[cite: 3327, 3614]. |
| **Dave Morrison** | Rigorous Rigidity / False Discrepancies [cite: 3694] | **Phase 1 (Active Code)**<br>Global Text Aggregator Pattern & Normalization [cite: 3330, 3406] | The evaluation framework flattens and normalizes all strings (clearing case mismatches and punctuation gaps) before evaluation[cite: 4170]. The pipeline treats multi-label imagery (Front, Back, Neck wraps) as a unified in-memory text context pool, ensuring an ABV field located on a back label matches safely without triggering a false negative on the front layout[cite: 3324, 3407, 3620, 3621]. |
| **Dave Morrison** | Lack of Machine Transparency [cite: 3397] | **Phase 1 (Active Code)**<br>Interactive Bounding Box Highlights & Logs [cite: 3325, 3402] | Every extracted metric maps absolute coordinate boxes (`y_min, x_min, y_max, x_max`) normalized on a scale of `0 to 1000` directly over the text layers via vector SVG overlays[cite: 3325, 3481, 3482]. Clicking an active form field automatically scrolls to and pulses its exact bounding box coordinate on the image[cite: 3616]. Includes a read-only **AI Audit Trail Log** capturing the background reasoning of the vision engine[cite: 3362, 3412, 3617, 3618]. |
| **Jenny Park** | Punctuation & Capitalization Errors [cite: 3399, 3700] | **Phase 1 (Active Code)**<br>Deterministic Regex Matching Layer [cite: 3316, 3388] | Bypasses standard LLM generation fuzziness for final verdicts. A dedicated client execution module (`src/validator.js`) runs rigorous regular expression checks against 27 CFR legal boundaries (ABV tolerances across Part 4, Part 5, Part 7, and word-for-word string verification for the Part 16 federal health warning text)[cite: 3330, 3331, 3332, 3333, 3334]. |
| **Jenny Park** | Hallucinations on Blurry/Low-Quality Images | **Phase 1 (Active Code)**<br>Transcription Clarity Circuit Breaker [cite: 3335, 3408] | Multimodal prompt constraints force the model to perform a single-pass self-evaluation of visual clarity per field grouping[cite: 3425, 3426]. If an optical asset clarity rating drops below an **85% strict threshold limit**, the validator triggers a yellow warning triage indicator, freezes automated approval steps, and forces a manual human review[cite: 3336, 3408, 3429, 3627, 3628]. |
| **Jenny Park** | Real-World Image Distortions [cite: 3704] | **Phase 2/3 (README Roadmap)**<br>Hybrid Pixel Pre-Processor Blueprint [cite: 3433] | Incorporates a client or server-side open-source computer vision preprocessing layer (e.g., OpenCV or Sharp) designed to evaluate geometric alignment, exposure levels, and skew balances before streaming data packages to the model, preventing compute budget wastage on unreadable labels[cite: 3433, 3434]. |
| **All Stakeholders** | Unpredictable, Messy Filenames [cite: 2969, 2973] | **Phase 3 (Implementation)**<br>Content-Based Real-World Matching [cite: 2974] | Rather than relying on rigid, uniform filename schemas (e.g., `[TTB_ID]_front.png`) [cite: 2958], which private applicants do not possess prior to submission [cite: 2968, 2971], the interface leverages a **Filename Proximity and Content Scoring Loop**[cite: 3004, 3010]. Files uploaded concurrently are grouped dynamically by shared base brand keywords (e.g., `silveroak_front.jpg` and `silveroak_back.png` clump together)[cite: 3008]. When the applicant's official Form 5100.31 JSON manifest is uploaded later, a multi-field scoring loop automatically stitches the orphan image clusters to the form by matching brand, fanciful name, and registry strings[cite: 3009, 3010, 3011]. |

---

## 3. Core Technical Data Contracts

### A. 2023 TTB Form 5100.31 Ingestion Schema
To achieve a perfect architectural match between official government filings and the automated web application, paper fields are explicitly translated into a clean, un-nested JSON schema layout. When an approved document or an applicant's manifest is imported, it populates the local form components based on the following structural contract:

```json
{
  "ttb_id": "26155001000732",
  "omb_number": "1513-0020",
  "form_revision_date": "06-2016",
  "status": "APPROVED",
  "part_1_application": {
    "field_1_rep_id_no": "",
    "field_2_plant_registry_basic_permit_brewer_no": "BWN-CA-24914",
    "field_3_source_of_product": "Domestic",
    "field_4_serial_number": "266191",
    "field_5_type_of_product": "WINE",
    "field_6_brand_name": "COOK'S",
    "field_7_fanciful_name": "GRAND RESERVE",
    "field_8_applicant_details": {
      "name": "TWG Woodbridge, THE WINE GROUP LLC",
      "street": "5950 E WOODBRIDGE RD",
      "city_state_zip": "Acampo CA 95220"
    },
    "field_8a_mailing_address": "",
    "field_9_formula": "",
    "field_10_grape_varietals": [
      "N/A"
    ],
    "field_11_wine_appellation": "CALIFORNIA",
    "field_12_phone_number": "(209) 599-4111",
    "field_13_email_address": "",
    "field_14_type_of_application": {
      "certificate_of_label_approval": true,
      "certificate_of_exemption": false,
      "distinctive_liquor_bottle_approval": false,
      "resubmission_after_rejection": false
    },
    "field_15_extra_information_translations": "ACAMPO: BOTTLE CODE WILL HAVE JULIAN LINEWOODBRIDGE DAYOFYEAR TIME (EX: LW062190106:12)\nNET CONTENT MAY OR MAY NOT BE BLOWN INTO THE CONTAINER."
  },
  "part_2_applicants_certification": {
    "field_16_date_of_application": "06/04/2026",
    "field_17_signature_placeholder": "(Application was e-filed)",
    "field_18_print_name": "ANNE MARIE BELTRAN"
  },
  "ai_label_extraction_targets": {
    "brand_name": "COOK'S",
    "class_type": "SPARKLING WINE/CHAMPAGNE",
    "alcohol_content": "",
    "net_contents": "",
    "government_warning": ""
  }
}
