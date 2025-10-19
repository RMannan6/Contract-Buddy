import OpenAI from "openai";

const apiKey = process.env.AIML_API_KEY || process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn("Warning: Neither AIML_API_KEY nor OPENAI_API_KEY is set. Party extraction will fail.");
}

const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: process.env.AIML_API_KEY ? 'https://api.aimlapi.com/v1' : undefined,
});

export interface PartyExtractionResult {
  draftingPartyName: string | null;
  confidence: 'high' | 'medium' | 'low';
  context: string;
}

/**
 * Extracts the first listed entity or party name from a contract
 * Assumes the first party mentioned is typically the drafting party
 */
export async function extractDraftingParty(contractText: string): Promise<PartyExtractionResult> {
  try {
    // Take first 2000 characters to focus on the header/preamble where parties are typically listed
    const contractStart = contractText.slice(0, 2000);
    
    const prompt = `You are a legal document analyzer. Your task is to identify the first party or entity name mentioned in this contract.

The first party mentioned is typically the drafting party (the one who wrote or provided the contract).

Look for patterns like:
- "This Agreement is made between [PARTY NAME] and..."
- "This Contract dated ... is entered into by [PARTY NAME]..."
- "PARTY 1: [NAME]"
- "[PARTY NAME] (hereinafter referred to as..."

Extract ONLY the entity/party name, not descriptions like "hereinafter referred to as" or legal role descriptions.

Contract excerpt:
${contractStart}

Respond with a JSON object in this exact format:
{
  "draftingPartyName": "The first party name or entity",
  "confidence": "high|medium|low",
  "context": "Brief explanation of where/how you found this name"
}

If you cannot identify a clear party name, set draftingPartyName to null and explain why in context.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a legal document analyzer that extracts party names from contracts. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    
    // Strip markdown code blocks if present (GPT-4o sometimes wraps JSON in ```json...```)
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    
    const result = JSON.parse(cleanedResponse);
    
    return {
      draftingPartyName: result.draftingPartyName || null,
      confidence: result.confidence || 'low',
      context: result.context || 'No context provided'
    };
    
  } catch (error) {
    console.error('Error extracting drafting party:', error);
    return {
      draftingPartyName: null,
      confidence: 'low',
      context: 'Failed to extract party name due to an error'
    };
  }
}
