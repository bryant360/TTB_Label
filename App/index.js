export default {
  async fetch(request, env) {
    // 1. Establish Strict Enterprise Global CORS Headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle Preflight OPTIONS requests instantly
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      // 2. Extract Data Ingestion Payload
      const payload = await request.json();
      console.log("Edge Received Application Payload Structure");

      // Locate our structural array bounds safely
      const targetImage = payload.images && payload.images[0];
      if (!targetImage || !targetImage.data) {
        return new Response(JSON.stringify({ error: "Missing valid image payload data buffers." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Cleanly extract base64 data string stripping potential header wraps
      let rawBase64 = targetImage.data;
      if (rawBase64.includes("base64,")) {
        rawBase64 = rawBase64.split("base64,")[1];
      }

      // 3. Construct the Unified REST Payload targeting the Active Stable Model
      // TARGET MODEL CHANGED EXPLICITLY TO GERMINI-3.5-FLASH FOR STABLE V1 COMPLIANCE
      const geminiApiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-lite:generateContent?key=${env.GEMINI_API_KEY}`;

      const systemInstruction =
        "You are an automated compliance agent for the TTB. Analyze the provided alcohol label artwork image. " +
        "Extract the required bounding boxes and text strings, and return them formatted EXACTLY matching the requested JSON schema. " +
        "Do not include markdown blocks, text descriptions, or friendly prose. Return pure raw JSON text.";

      const promptText =
        "Return a structural JSON payload mapping text fields. You MUST output a JSON object containing a 'ttb_application_id' " +
        "matching the one sent, and an 'extracted_assets' array. For each asset, extract 'field_6_brand_name', 'field_7_fanciful_name', " +
        "'field_12_net_contents', 'field_13_alcohol_content', 'field_government_warning', 'field_100_class_type_designation', and 'field_101_name_and_address' if present. " +
        "Provide absolute bounding_box markers normalized on a scale of 0 to 1000 using keys: y_min, x_min, y_max, x_max. " +
        "Enforce a high 'field_clarity_score' primitive integer metric.";

      const requestBody = {
        contents: [
          {
            parts: [
              { text: `${systemInstruction}\n\n${promptText}` },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: rawBase64,
                },
              },
            ],
          },
        ],
      };

      // 4. Fire the Upstream Stream Loop Pipeline
      const response = await fetch(geminiApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Upstream AI Studio Endpoint Rejected Payload:", JSON.stringify(responseData));
        return new Response(JSON.stringify({ error: "Upstream processing failure", details: responseData }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 5. Build Safe Ephemeral Return Channel
      // Parse out the text result safely from the stable REST response structure
      const modelTextResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

      // Clean up accidental markdown blocks if the model appended them despite instructions
      let cleanJsonString = modelTextResponse.trim();
      if (cleanJsonString.startsWith("```json")) {
        cleanJsonString = cleanJsonString.substring(7, cleanJsonString.length - 3).trim();
      } else if (cleanJsonString.startsWith("```")) {
        cleanJsonString = cleanJsonString.substring(3, cleanJsonString.length - 3).trim();
      }

      return new Response(cleanJsonString, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (error) {
      console.error("Worker Execution Error:", error.message);
      return new Response(JSON.stringify({ error: "Internal Server Error", message: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};