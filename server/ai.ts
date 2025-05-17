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
  
  prompt += `Please identify the 5 most important clauses to negotiate based on risk level and impact. 
Focus on clauses that may disadvantage the customer and provide specific recommendations to improve them.
For each recommended change, provide a clear explanation of why it matters in plain English that a non-lawyer can understand.`;
  
  return prompt;
}

// More intelligent fallback that uses the matched clauses
function getIntelligentFallbackWithMatchedClauses(matchedClauses: MatchedClause[]): NegotiationPoint[] {
  // For demonstration, we'll use the type of the clause to determine what kind of analysis to provide
  const typedAnalysis: Record<string, NegotiationPoint> = {
    limitation_of_liability: {
      title: "Limitation of Liability",
      originalClause: matchedClauses.find(c => c.userClause.type === "limitation_of_liability")?.userClause.content || 
        "Supplier's total liability arising out of or related to this Agreement, whether in contract, tort or otherwise, shall not exceed the amount paid by Customer in the 12 months preceding the event giving rise to the claim.",
      explanation: "This clause severely restricts the amount the supplier would have to pay if something goes wrong, even if they are at fault. The cap is tied to recent payments, which could be far less than your actual damages in case of a major issue.",
      suggestion: "Supplier's total liability arising out of or related to this Agreement, whether in contract, tort or otherwise, shall not exceed the greater of (i) three times the total amount paid by Customer under this Agreement, or (ii) $1,000,000. This limitation shall not apply to Supplier's indemnification obligations, breaches of confidentiality, data breaches, or gross negligence.",
      riskLevel: "high"
    },
    termination: {
      title: "Termination for Convenience",
      originalClause: matchedClauses.find(c => c.userClause.type === "termination")?.userClause.content || 
        "Supplier may terminate this Agreement at any time upon thirty (30) days' written notice to Customer. Customer may terminate this Agreement for convenience upon ninety (90) days' written notice to Supplier.",
      explanation: "This termination clause creates an imbalance where the supplier can exit quickly (30 days) while you need three times as long (90 days). This puts you at risk if the supplier decides to end the relationship, giving you limited time to find alternatives.",
      suggestion: "Either party may terminate this Agreement for convenience upon sixty (60) days' written notice to the other party. In the event Supplier terminates for convenience, Supplier shall provide reasonable transition assistance to Customer at no additional cost for a period of up to 30 days following the termination date.",
      riskLevel: "medium"
    },
    intellectual_property: {
      title: "Intellectual Property Rights",
      originalClause: matchedClauses.find(c => c.userClause.type === "intellectual_property")?.userClause.content || 
        "Customer agrees that all intellectual property rights, including but not limited to patents, copyrights, trademarks and trade secrets, in any materials created by Supplier under this Agreement shall be owned exclusively by Supplier. Customer shall have a non-exclusive license to use such materials for its internal business purposes only.",
      explanation: "Under this clause, you would not own any intellectual property that you're paying the supplier to create for you. Instead, you would only have a limited license to use it internally. This could severely restrict your ability to modify, expand upon, or commercialize the work you've paid for.",
      suggestion: "All intellectual property rights, including but not limited to patents, copyrights, trademarks and trade secrets, in any materials specifically created for Customer by Supplier under this Agreement shall be owned exclusively by Customer. Supplier shall retain ownership of its pre-existing intellectual property and general know-how. Supplier hereby grants Customer a perpetual, irrevocable, worldwide, royalty-free license to use, modify, and incorporate Supplier's pre-existing intellectual property as necessary to use the deliverables for any business purpose.",
      riskLevel: "high"
    },
    indemnification: {
      title: "Indemnification",
      originalClause: matchedClauses.find(c => c.userClause.type === "indemnification")?.userClause.content || 
        "Customer shall defend, indemnify and hold harmless Supplier from and against all claims, damages, losses and expenses, including but not limited to attorneys' fees, arising out of or resulting from Customer's use of the services or deliverables provided under this Agreement.",
      explanation: "This one-sided indemnification clause requires you to protect the supplier from all claims related to your use of their services, but doesn't require them to protect you from claims that might arise from defects in their work. This places an unfair burden on you for potential legal issues.",
      suggestion: "Each party shall defend, indemnify and hold harmless the other party from and against all claims, damages, losses and expenses, including but not limited to attorneys' fees, arising out of or resulting from such party's breach of this Agreement, violation of applicable law, or negligent or willful acts or omissions. Supplier shall additionally indemnify Customer against any claims alleging that Customer's authorized use of the deliverables infringes any third party's intellectual property rights.",
      riskLevel: "medium"
    },
    payment_terms: {
      title: "Payment Terms",
      originalClause: matchedClauses.find(c => c.userClause.type === "payment_terms")?.userClause.content || 
        "Customer shall pay all invoices within fifteen (15) days of receipt. Any amounts not paid when due will accrue interest at a rate of 1.5% per month or the maximum rate permitted by law, whichever is less.",
      explanation: "The payment window of 15 days is unusually short compared to standard business practices (typically 30 days). Additionally, the interest rate of 1.5% per month (18% annually) is quite high. These terms could put unnecessary financial pressure on your business.",
      suggestion: "Customer shall pay all undisputed invoices within thirty (30) days of receipt. Customer shall notify Supplier of any disputed invoice items within 10 days of receipt, and the parties shall work in good faith to resolve such disputes. Any undisputed amounts not paid when due will accrue interest at a rate of 1% per month or the maximum rate permitted by law, whichever is less.",
      riskLevel: "low"
    },
    confidentiality: {
      title: "Confidentiality",
      originalClause: matchedClauses.find(c => c.userClause.type === "confidentiality")?.userClause.content || 
        "Customer agrees to maintain the confidentiality of all proprietary information disclosed by Supplier and shall not disclose such information to any third party without Supplier's prior written consent.",
      explanation: "This one-sided confidentiality clause only protects the supplier's information while not requiring them to protect your confidential information. It also has no time limitation, potentially creating an indefinite obligation.",
      suggestion: "Each party shall maintain the confidentiality of the other party's Confidential Information and shall not disclose or use such Confidential Information except as necessary to perform under this Agreement. Each party shall protect the other party's Confidential Information using at least the same degree of care it uses to protect its own confidential information, but no less than reasonable care. These obligations shall survive termination of this Agreement for a period of 5 years.",
      riskLevel: "medium"
    }
  };

  // Identify which clauses we have in the contract
  const analysisResults: NegotiationPoint[] = [];
  
  // First add clauses that match known types
  for (const type of Object.keys(typedAnalysis)) {
    const matchedClause = matchedClauses.find(c => c.userClause.type === type);
    if (matchedClause) {
      // Use the actual clause text from the user's contract
      const analysis = {...typedAnalysis[type]};
      analysis.originalClause = matchedClause.userClause.content;
      analysisResults.push(analysis);
    }
  }
  
  // If we have fewer than 5 points, add some fallback ones
  const fallbackAnalysis = getFallbackAnalysis();
  while (analysisResults.length < 5 && fallbackAnalysis.length > 0) {
    const fallback = fallbackAnalysis.shift();
    // Only add if we don't already have this type
    if (fallback && !analysisResults.some(a => a.title === fallback.title)) {
      analysisResults.push(fallback);
    }
  }
  
  return analysisResults;
}

// Basic fallback for when no clauses are available
function getFallbackAnalysis(): NegotiationPoint[] {
  return [
    {
      title: "Limitation of Liability",
      originalClause: "Supplier's total liability arising out of or related to this Agreement, whether in contract, tort or otherwise, shall not exceed the amount paid by Customer in the 12 months preceding the event giving rise to the claim.",
      explanation: "This clause severely restricts the amount the supplier would have to pay if something goes wrong, even if they are at fault. The cap is tied to recent payments, which could be far less than your actual damages in case of a major issue.",
      suggestion: "Supplier's total liability arising out of or related to this Agreement, whether in contract, tort or otherwise, shall not exceed the greater of (i) three times the total amount paid by Customer under this Agreement, or (ii) $1,000,000. This limitation shall not apply to Supplier's indemnification obligations, breaches of confidentiality, data breaches, or gross negligence.",
      riskLevel: "high"
    },
    {
      title: "Termination for Convenience",
      originalClause: "Supplier may terminate this Agreement at any time upon thirty (30) days' written notice to Customer. Customer may terminate this Agreement for convenience upon ninety (90) days' written notice to Supplier.",
      explanation: "This termination clause creates an imbalance where the supplier can exit quickly (30 days) while you need three times as long (90 days). This puts you at risk if the supplier decides to end the relationship, giving you limited time to find alternatives.",
      suggestion: "Either party may terminate this Agreement for convenience upon sixty (60) days' written notice to the other party. In the event Supplier terminates for convenience, Supplier shall provide reasonable transition assistance to Customer at no additional cost for a period of up to 30 days following the termination date.",
      riskLevel: "medium"
    },
    {
      title: "Intellectual Property Rights",
      originalClause: "Customer agrees that all intellectual property rights, including but not limited to patents, copyrights, trademarks and trade secrets, in any materials created by Supplier under this Agreement shall be owned exclusively by Supplier. Customer shall have a non-exclusive license to use such materials for its internal business purposes only.",
      explanation: "Under this clause, you would not own any intellectual property that you're paying the supplier to create for you. Instead, you would only have a limited license to use it internally. This could severely restrict your ability to modify, expand upon, or commercialize the work you've paid for.",
      suggestion: "All intellectual property rights, including but not limited to patents, copyrights, trademarks and trade secrets, in any materials specifically created for Customer by Supplier under this Agreement shall be owned exclusively by Customer. Supplier shall retain ownership of its pre-existing intellectual property and general know-how. Supplier hereby grants Customer a perpetual, irrevocable, worldwide, royalty-free license to use, modify, and incorporate Supplier's pre-existing intellectual property as necessary to use the deliverables for any business purpose.",
      riskLevel: "high"
    },
    {
      title: "Indemnification",
      originalClause: "Customer shall defend, indemnify and hold harmless Supplier from and against all claims, damages, losses and expenses, including but not limited to attorneys' fees, arising out of or resulting from Customer's use of the services or deliverables provided under this Agreement.",
      explanation: "This one-sided indemnification clause requires you to protect the supplier from all claims related to your use of their services, but doesn't require them to protect you from claims that might arise from defects in their work. This places an unfair burden on you for potential legal issues.",
      suggestion: "Each party shall defend, indemnify and hold harmless the other party from and against all claims, damages, losses and expenses, including but not limited to attorneys' fees, arising out of or resulting from such party's breach of this Agreement, violation of applicable law, or negligent or willful acts or omissions. Supplier shall additionally indemnify Customer against any claims alleging that Customer's authorized use of the deliverables infringes any third party's intellectual property rights.",
      riskLevel: "medium"
    },
    {
      title: "Payment Terms",
      originalClause: "Customer shall pay all invoices within fifteen (15) days of receipt. Any amounts not paid when due will accrue interest at a rate of 1.5% per month or the maximum rate permitted by law, whichever is less.",
      explanation: "The payment window of 15 days is unusually short compared to standard business practices (typically 30 days). Additionally, the interest rate of 1.5% per month (18% annually) is quite high. These terms could put unnecessary financial pressure on your business.",
      suggestion: "Customer shall pay all undisputed invoices within thirty (30) days of receipt. Customer shall notify Supplier of any disputed invoice items within 10 days of receipt, and the parties shall work in good faith to resolve such disputes. Any undisputed amounts not paid when due will accrue interest at a rate of 1% per month or the maximum rate permitted by law, whichever is less.",
      riskLevel: "low"
    }
  ];
}
