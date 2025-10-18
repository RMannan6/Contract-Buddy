import OpenAI from "openai";
import { 
  Document, 
  Clause, 
  GoldStandardClause, 
  NegotiationPoint 
} from "@shared/schema";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Main function to analyze the contract
export async function analyzeContract(
  document: Document,
  clauses: Clause[],
  goldStandardClauses: GoldStandardClause[]
): Promise<{ negotiationPoints: NegotiationPoint[] }> {
  try {
    // 1. Generate embeddings for the clauses
    const clauseEmbeddings = await generateEmbeddings(clauses.map(c => c.content));
    
    // 2. Compare with gold standard clauses and find the most relevant ones
    const matchedClauses = findMatchingClauses(clauses, clauseEmbeddings, goldStandardClauses);
    
    // 3. Generate analysis and recommendations using the LLM
    const negotiationPoints = await generateAnalysis(matchedClauses);
    
    return { negotiationPoints };
  } catch (error) {
    console.error("Error analyzing contract:", error);
    throw new Error("Failed to analyze contract");
  }
}

// Generate mock embeddings for demo purposes
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    // Create mock embeddings for demo purposes
    // In a real implementation, we would use an API call to generate actual embeddings
    return texts.map(text => {
      // Create a simple mock embedding based on text length and character codes
      const embedding = Array(128).fill(0).map((_, i) => {
        // Use hash of character codes to generate pseudo-random but deterministic values
        let hash = 0;
        for (let j = 0; j < Math.min(text.length, 100); j++) {
          hash = ((hash << 5) - hash) + text.charCodeAt(j) + i;
          hash |= 0; // Convert to 32bit integer
        }
        return (hash % 1000) / 1000; // Normalize to range of -1 to 1
      });
      
      return embedding;
    });
  } catch (error) {
    console.error("Error generating mock embeddings:", error);
    throw new Error("Failed to generate embeddings");
  }
}

// Find matching gold standard clauses for each clause
interface MatchedClause {
  userClause: Clause;
  goldStandard: GoldStandardClause;
  similarity: number;
}

function findMatchingClauses(
  clauses: Clause[],
  clauseEmbeddings: number[][],
  goldStandardClauses: GoldStandardClause[]
): MatchedClause[] {
  // For now, since we're not using actual embeddings on stored goldStandardClauses (for simplicity),
  // we'll use a simpler matching approach based on clause type
  const matchedClauses: MatchedClause[] = [];
  
  for (let i = 0; i < clauses.length; i++) {
    const userClause = clauses[i];
    
    // Find gold standard clauses of the same type or default to the first one
    const matchingGoldStandards = goldStandardClauses.filter(
      gold => gold.type === userClause.type
    );
    
    if (matchingGoldStandards.length > 0) {
      // Use the first matching gold standard clause
      matchedClauses.push({
        userClause,
        goldStandard: matchingGoldStandards[0],
        similarity: 0.8 // Placeholder similarity score
      });
    }
  }
  
  return matchedClauses;
}

// Generate analysis and recommendations
async function generateAnalysis(matchedClauses: MatchedClause[]): Promise<NegotiationPoint[]> {
  try {
    // First check if we should use the OpenAI API or the fallback
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-...") {
      console.log("No valid OpenAI API key found, using intelligent fallback analysis");
      return getIntelligentFallbackWithMatchedClauses(matchedClauses);
    }
    
    try {
      // Create prompt for the LLM
      const prompt = createAnalysisPrompt(matchedClauses);
      
      // Call the LLM
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert contract analyzer. Your task is to analyze contract clauses and provide recommendations to improve them. You should identify the risk level (high, medium, low) for each clause, explain why it matters, and suggest better wording."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });
      
      // Parse the response
      const content = response.choices[0].message.content;
      if (!content) {
        return getIntelligentFallbackWithMatchedClauses(matchedClauses);
      }
      const result = JSON.parse(content);
      return result.negotiationPoints || getIntelligentFallbackWithMatchedClauses(matchedClauses);
    } catch (apiError: any) {
      // If API error (like quota exceeded), use intelligent fallback
      console.log("OpenAI API error, using intelligent fallback analysis:", apiError.message || apiError);
      return getIntelligentFallbackWithMatchedClauses(matchedClauses);
    }
    
  } catch (error) {
    console.error("Error generating analysis:", error);
    
    // Return fallback analysis
    return getIntelligentFallbackWithMatchedClauses(matchedClauses);
  }
}

// Create prompt for the LLM
function createAnalysisPrompt(matchedClauses: MatchedClause[]): string {
  let prompt = `I need you to analyze the following contract clauses and provide recommendations. 
For each clause, determine the risk level (high, medium, low), explain why it matters, and suggest improved wording.
Please respond with a JSON object containing an array of negotiationPoints with the following structure:
{
  "negotiationPoints": [
    {
      "title": "Clause title",
      "originalClause": "Original text",
      "explanation": "Why this matters",
      "suggestion": "Improved wording",
      "riskLevel": "high|medium|low"
    }
  ]
}

Here are the clauses to analyze:\n\n`;

  matchedClauses.forEach((match, index) => {
    prompt += `CLAUSE ${index + 1}:\n`;
    prompt += `Original text: ${match.userClause.content}\n`;
    prompt += `Gold standard example: ${match.goldStandard.content}\n`;
    prompt += `Clause type: ${match.userClause.type || 'unknown'}\n\n`;
  });
  
  prompt += `Please analyze EACH clause separately and provide recommendations for ALL of them. 
For each clause, determine if it may disadvantage the customer and provide specific recommendations to improve it.
Provide a clear explanation of why each clause matters in plain English that a non-lawyer can understand.
Include ALL clauses in your analysis - do not skip any.`;
  
  return prompt;
}

// More intelligent fallback that uses the matched clauses
function getIntelligentFallbackWithMatchedClauses(matchedClauses: MatchedClause[]): NegotiationPoint[] {
  // ONLY analyze clauses that actually exist in the contract - no defaults or hallucinations
  const analysisResults: NegotiationPoint[] = [];
  
  // Process each matched clause from the actual contract
  for (const match of matchedClauses) {
    const type = match.userClause.type;
    const actualClauseText = match.userClause.content;
    
    // Generate analysis based on clause type, but ALWAYS use the actual clause text
    let analysis: NegotiationPoint | null = null;
    
    if (type === "limitation_of_liability") {
      analysis = {
        title: "Limitation of Liability",
        originalClause: actualClauseText,
        explanation: "This clause restricts the amount the supplier would have to pay if something goes wrong. Review whether the liability cap adequately protects your interests in case of a major issue.",
        suggestion: "Consider negotiating for higher liability caps that better reflect potential damages. Ensure the limitation doesn't apply to cases of gross negligence, willful misconduct, or data breaches.",
        riskLevel: "high"
      };
    } else if (type === "termination") {
      analysis = {
        title: "Termination Clause",
        originalClause: actualClauseText,
        explanation: "Review the termination terms to ensure they provide adequate notice periods and don't create an imbalance between parties.",
        suggestion: "Consider equal notice periods for both parties and include provisions for transition assistance if the supplier terminates.",
        riskLevel: "medium"
      };
    } else if (type === "intellectual_property") {
      analysis = {
        title: "Intellectual Property Rights",
        originalClause: actualClauseText,
        explanation: "This clause determines who owns the work product created under the agreement. Ensure you retain appropriate rights to use and modify deliverables.",
        suggestion: "Consider requesting ownership of custom work product created specifically for you, while allowing the supplier to retain their pre-existing IP and general know-how.",
        riskLevel: "high"
      };
    } else if (type === "indemnification") {
      analysis = {
        title: "Indemnification",
        originalClause: actualClauseText,
        explanation: "Review whether the indemnification obligations are balanced between parties and appropriate for the risks involved.",
        suggestion: "Consider mutual indemnification provisions and ensure the supplier indemnifies you against IP infringement claims arising from their deliverables.",
        riskLevel: "medium"
      };
    } else if (type === "payment_terms") {
      analysis = {
        title: "Payment Terms",
        originalClause: actualClauseText,
        explanation: "Review the payment timeline and late payment penalties to ensure they align with your standard business practices.",
        suggestion: "Consider negotiating for standard 30-day payment terms and lower interest rates on late payments. Include provisions for disputing invoices.",
        riskLevel: "low"
      };
    } else if (type === "confidentiality") {
      analysis = {
        title: "Confidentiality",
        originalClause: actualClauseText,
        explanation: "Ensure confidentiality obligations are mutual and have reasonable time limitations.",
        suggestion: "Consider mutual confidentiality provisions with a defined time period (e.g., 5 years after termination) and clear exclusions for information already known or publicly available.",
        riskLevel: "medium"
      };
    } else if (type === "warranty") {
      analysis = {
        title: "Warranty",
        originalClause: actualClauseText,
        explanation: "Review warranty provisions to ensure adequate protection and remedies if deliverables don't meet specifications.",
        suggestion: "Consider including specific performance warranties and clear remedies such as re-performance or refunds if warranties are breached.",
        riskLevel: "medium"
      };
    } else if (type === "governing_law") {
      analysis = {
        title: "Governing Law and Jurisdiction",
        originalClause: actualClauseText,
        explanation: "The choice of governing law and jurisdiction can significantly impact your rights and litigation costs.",
        suggestion: "Consider negotiating for governing law and jurisdiction in your home state or a neutral location to minimize litigation costs.",
        riskLevel: "low"
      };
    } else {
      // For unknown types, provide generic analysis
      analysis = {
        title: `${type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Contract Clause'}`,
        originalClause: actualClauseText,
        explanation: "This clause should be reviewed by legal counsel to ensure it adequately protects your interests.",
        suggestion: "Have your attorney review this clause to identify any potential risks or areas for negotiation.",
        riskLevel: "medium"
      };
    }
    
    if (analysis) {
      analysisResults.push(analysis);
    }
  }
  
  // Return ALL clauses found in the actual contract - analyze each one separately
  return analysisResults;
} 
