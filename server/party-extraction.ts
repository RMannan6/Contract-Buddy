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
  party1Name: string | null;
  party2Name: string | null;
  confidence: 'high' | 'medium' | 'low';
  context: string;
}

/**
 * Extracts both party names from a contract
 * Returns the first and second parties mentioned in the agreement
 */
export async function extractBothParties(contractText: string): Promise<PartyExtractionResult> {
  try {
    // Take first 2000 characters to focus on the header/preamble where parties are typically listed
    const contractStart = contractText.slice(0, 2000);
    
    const prompt = `You are a legal document analyzer. Your task is to identify BOTH parties (entities or individuals) mentioned in this contract.

Look for patterns like:
- "This Agreement is made between [PARTY 1 NAME] and [PARTY 2 NAME]..."
- "This Contract is entered into by [PARTY 1] and [PARTY 2]..."
- "PARTY 1: [NAME] ... PARTY 2: [NAME]"
- "[PARTY 1 NAME] (hereinafter referred to as...) and [PARTY 2 NAME] (hereinafter..."

Extract ONLY the entity/party names, not descriptions like "hereinafter referred to as", legal role descriptions, or pronouns.

Contract excerpt:
${contractStart}

Respond with a JSON object in this exact format:
{
  "party1Name": "The first party name or entity",
  "party2Name": "The second party name or entity",
  "confidence": "high|medium|low",
  "context": "Brief explanation of where/how you found these names"
}

If you cannot identify both party names, set the missing party to null and explain why in context.`;

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
      party1Name: result.party1Name || null,
      party2Name: result.party2Name || null,
      confidence: result.confidence || 'low',
      context: result.context || 'No context provided'
    };
    
  } catch (error) {
    console.error('Error extracting party names:', error);
    return {
      party1Name: null,
      party2Name: null,
      confidence: 'low',
      context: 'Failed to extract party names due to an error'
    };
  }
}
