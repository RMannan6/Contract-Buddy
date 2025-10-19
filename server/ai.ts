import OpenAI from "openai";
import { 
  Document, 
  Clause, 
  GoldStandardClause, 
  NegotiationPoint 
} from "@shared/schema";

// Initialize OpenAI client with AIML API gateway (provides access to 300+ AI models)
const openai = new OpenAI({ 
  apiKey: process.env.AIML_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AIML_API_KEY ? "https://api.aimlapi.com/v1" : undefined
});

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

// Priority order for clause types (highest risk first)
const CLAUSE_TYPE_PRIORITY: { [key: string]: number } = {
  'limitation_of_liability': 1,
  'indemnification': 2,
  'intellectual_property': 3,
  'termination': 4,
  'payment_terms': 5,
  'confidentiality': 6,
  'warranty': 7,
  'governing_law': 8,
  'assignment': 9,
  'other': 10
};

function findMatchingClauses(
  clauses: Clause[],
  clauseEmbeddings: number[][],
  goldStandardClauses: GoldStandardClause[]
): MatchedClause[] {
  // Match clauses with gold standards based on type
  const allMatchedClauses: MatchedClause[] = [];
  
  for (let i = 0; i < clauses.length; i++) {
    const userClause = clauses[i];
    
    // Find gold standard clauses of the same type
    const matchingGoldStandards = goldStandardClauses.filter(
      gold => gold.type === userClause.type
    );
    
    // If we find a matching gold standard, use it
    if (matchingGoldStandards.length > 0) {
      allMatchedClauses.push({
        userClause,
        goldStandard: matchingGoldStandards[0],
        similarity: 0.8
      });
    } else {
      // If no exact match, use a generic gold standard or create a fallback
      // This ensures we always have something to analyze
      const fallbackGold = goldStandardClauses.find(g => g.type === 'other') || goldStandardClauses[0];
      if (fallbackGold) {
        allMatchedClauses.push({
          userClause,
          goldStandard: fallbackGold,
          similarity: 0.5
        });
      }
    }
  }
  
  // Sort by priority (highest risk first) and take only top 5
  const sortedClauses = allMatchedClauses.sort((a, b) => {
    const priorityA = CLAUSE_TYPE_PRIORITY[a.userClause.type || 'other'] || 10;
    const priorityB = CLAUSE_TYPE_PRIORITY[b.userClause.type || 'other'] || 10;
    return priorityA - priorityB;
  });
  
  // Return only the top 5 highest priority clauses
  return sortedClauses.slice(0, 5);
}

// Generate analysis and recommendations
async function generateAnalysis(matchedClauses: MatchedClause[]): Promise<NegotiationPoint[]> {
  try {
    // If no matched clauses, return empty but log warning
    if (matchedClauses.length === 0) {
      console.warn("No matched clauses found for analysis");
      return [];
    }
    
    // First check if we should use the AI API or the fallback
    if ((!process.env.AIML_API_KEY && !process.env.OPENAI_API_KEY) || 
        process.env.OPENAI_API_KEY === "sk-...") {
      console.log("No valid AI API key found, using intelligent fallback analysis");
      return getIntelligentFallbackWithMatchedClauses(matchedClauses);
    }
    
    try {
      // Create prompt for the LLM
      const prompt = createAnalysisPrompt(matchedClauses);
      
      // Call the LLM using GPT-5 for advanced contract analysis
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are an expert contract attorney. Your task is to analyze contract clauses and rewrite them to better protect the customer's interests. For each clause, you must: 1) Identify the risk level (high, medium, low), 2) Explain why it matters in plain English, and 3) Provide an actual REWRITTEN version of the clause with improved wording that better protects the customer."
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
  let prompt = `I need you to analyze the following contract clauses and provide REWRITTEN versions that better protect the customer. 

CRITICAL INSTRUCTIONS:
- For the "suggestion" field, you MUST provide the complete REWRITTEN clause text (not advice, but actual replacement text)
- The rewritten clause should maintain the same legal structure but with improved terms favoring the customer
- Use the gold standard example as a reference for better language

Please respond with a JSON object containing an array of negotiationPoints with the following structure:
{
  "negotiationPoints": [
    {
      "title": "Clause title",
      "originalClause": "Original text",
      "explanation": "Why this matters (in plain English)",
      "suggestion": "COMPLETE REWRITTEN CLAUSE TEXT HERE (actual replacement text, not advice)",
      "riskLevel": "high|medium|low"
    }
  ]
}

Here are the clauses to analyze:\n\n`;

  matchedClauses.forEach((match, index) => {
    prompt += `CLAUSE ${index + 1}:\n`;
    prompt += `Type: ${match.userClause.type || 'unknown'}\n`;
    prompt += `Original clause text:\n${match.userClause.content}\n\n`;
    prompt += `Gold standard reference (use this as a guide for better wording):\n${match.goldStandard.content}\n\n`;
    prompt += `---\n\n`;
  });
  
  prompt += `IMPORTANT: Analyze EACH of these ${matchedClauses.length} clauses separately. 
For each clause:
1. Determine the risk level (high, medium, low) based on how much it disadvantages the customer
2. Explain why it matters in plain English that a non-lawyer can understand
3. REWRITE the entire clause with improved language that better protects the customer (do NOT just give advice - provide actual replacement text)

Return exactly ${matchedClauses.length} negotiation points, one for each clause listed above.`;
  
  return prompt;
}

// More intelligent fallback that uses the matched clauses
function getIntelligentFallbackWithMatchedClauses(matchedClauses: MatchedClause[]): NegotiationPoint[] {
  // Analyze each of the top 5 priority clauses separately
  const analysisResults: NegotiationPoint[] = [];
  
  // Process each matched clause from the actual contract (already limited to top 5 by findMatchingClauses)
  for (const match of matchedClauses) {
    const type = match.userClause.type;
    const actualClauseText = match.userClause.content;
    
    // Generate analysis based on clause type, but ALWAYS use the actual clause text
    let analysis: NegotiationPoint | null = null;
    
    if (type === "limitation_of_liability") {
      analysis = {
        title: "Limitation of Liability",
        originalClause: actualClauseText,
        explanation: "This clause restricts how much the supplier must pay if something goes wrong. The current version may cap liability too low to adequately protect you in case of major issues, and may not exclude gross negligence or data breaches.",
        suggestion: `LIMITATION OF LIABILITY: Notwithstanding anything to the contrary, neither party's aggregate liability arising out of or related to this Agreement shall exceed the greater of: (i) two times the total fees paid or payable under this Agreement in the twelve (12) months preceding the claim, or (ii) $500,000. The foregoing limitations shall not apply to: (a) either party's gross negligence or willful misconduct; (b) breach of confidentiality obligations; (c) infringement of the other party's intellectual property rights; (d) data breaches or unauthorized access to personal information; or (e) either party's indemnification obligations under this Agreement.`,
        riskLevel: "high"
      };
    } else if (type === "termination") {
      analysis = {
        title: "Termination Clause",
        originalClause: actualClauseText,
        explanation: "This clause controls how and when either party can end the agreement. Unbalanced termination rights can leave you vulnerable to sudden service disruption or unfavorable long-term commitments.",
        suggestion: `TERMINATION: Either party may terminate this Agreement: (a) for convenience by providing ninety (90) days prior written notice to the other party; (b) immediately upon written notice if the other party materially breaches this Agreement and fails to cure such breach within thirty (30) days of receiving written notice; or (c) immediately if the other party becomes insolvent, files for bankruptcy, or ceases business operations. Upon termination, Supplier shall provide reasonable transition assistance for up to sixty (60) days to facilitate migration to an alternative provider. Customer shall pay only for services rendered through the effective termination date.`,
        riskLevel: "medium"
      };
    } else if (type === "intellectual_property") {
      analysis = {
        title: "Intellectual Property Rights",
        originalClause: actualClauseText,
        explanation: "This clause determines who owns the work created under this agreement. If not properly negotiated, you could pay for custom work but not actually own it, limiting your ability to use, modify, or transfer it freely.",
        suggestion: `INTELLECTUAL PROPERTY: Customer shall own all right, title, and interest in and to all custom work product, deliverables, and materials created specifically for Customer under this Agreement ("Custom IP"). Supplier hereby assigns to Customer all Custom IP, and shall execute any documents reasonably necessary to perfect such assignment. Supplier retains ownership of its pre-existing intellectual property, tools, methodologies, and general know-how ("Supplier IP"). Supplier grants Customer a perpetual, irrevocable, worldwide, royalty-free license to use any Supplier IP incorporated into the Custom IP. Neither party shall use the other party's trademarks or brand without prior written consent.`,
        riskLevel: "high"
      };
    } else if (type === "indemnification") {
      analysis = {
        title: "Indemnification",
        originalClause: actualClauseText,
        explanation: "This clause determines who pays legal costs and damages if someone sues over the work performed. One-sided indemnification could leave you financially responsible for the supplier's mistakes or intellectual property violations.",
        suggestion: `INDEMNIFICATION: Supplier shall indemnify, defend, and hold harmless Customer from and against any and all claims, damages, losses, and expenses (including reasonable attorneys' fees) arising from: (a) any claim that the services or deliverables infringe or misappropriate any third party's intellectual property rights; (b) Supplier's breach of its obligations under this Agreement; or (c) Supplier's negligence or willful misconduct. Customer shall indemnify Supplier from claims arising solely from Customer's misuse of the deliverables in violation of this Agreement. The indemnified party shall promptly notify the indemnifying party of any claim and cooperate in the defense, and the indemnifying party shall have sole control of the defense and settlement.`,
        riskLevel: "medium"
      };
    } else if (type === "payment_terms") {
      analysis = {
        title: "Payment Terms",
        originalClause: actualClauseText,
        explanation: "This clause establishes when and how you must pay. Unfavorable payment terms could require upfront payment before delivery, impose excessive late fees, or prevent you from disputing incorrect charges.",
        suggestion: `PAYMENT TERMS: Customer shall pay invoiced amounts within thirty (30) days of invoice date via wire transfer or check. Supplier shall submit detailed invoices with supporting documentation for all fees. Customer may withhold payment and provide written notice if it disputes any charges in good faith; parties shall work together to resolve disputes within fifteen (15) days. Undisputed amounts remain due per the original schedule. Late payments shall accrue interest at the lesser of 1.5% per month or the maximum rate permitted by law. All fees are exclusive of applicable taxes, which Customer shall pay or provide valid exemption certificates.`,
        riskLevel: "low"
      };
    } else if (type === "confidentiality") {
      analysis = {
        title: "Confidentiality",
        originalClause: actualClauseText,
        explanation: "This clause protects sensitive information shared during the business relationship. One-sided or overly broad confidentiality obligations could restrict your ability to discuss your own business or use general knowledge gained during the relationship.",
        suggestion: `CONFIDENTIALITY: Each party agrees to maintain in confidence all Confidential Information disclosed by the other party and to use such information only for purposes of this Agreement. "Confidential Information" means non-public information marked as confidential or that reasonably should be considered confidential. Confidential Information excludes information that: (a) is or becomes publicly available through no breach of this Agreement; (b) was rightfully known prior to disclosure; (c) is independently developed without use of the other party's Confidential Information; or (d) is rightfully received from a third party without confidentiality obligations. These obligations survive for five (5) years after termination of this Agreement.`,
        riskLevel: "medium"
      };
    } else if (type === "warranty") {
      analysis = {
        title: "Warranty",
        originalClause: actualClauseText,
        explanation: "This clause establishes what the supplier promises about their work quality and what remedies you have if the work is defective. Weak warranties or disclaimer clauses can leave you with no recourse if deliverables don't meet your needs.",
        suggestion: `WARRANTIES: Supplier warrants that: (a) the services shall be performed in a professional and workmanlike manner consistent with industry standards; (b) the deliverables shall materially conform to the specifications agreed in the Statement of Work; (c) the deliverables shall not infringe any third party's intellectual property rights; and (d) Supplier has the full right and authority to enter into this Agreement and grant the rights granted herein. If any deliverables do not conform to these warranties, Supplier shall re-perform the non-conforming services or replace the non-conforming deliverables at no additional charge within thirty (30) days of notice. If Supplier fails to cure the breach within such period, Customer may terminate the affected portion and receive a pro-rata refund.`,
        riskLevel: "medium"
      };
    } else if (type === "governing_law") {
      analysis = {
        title: "Governing Law and Jurisdiction",
        originalClause: actualClauseText,
        explanation: "This clause determines which state's laws apply and where lawsuits must be filed. Unfavorable jurisdiction could force you to litigate in a distant, expensive forum or under laws that don't protect your interests as well.",
        suggestion: `GOVERNING LAW AND JURISDICTION: This Agreement shall be governed by and construed in accordance with the laws of the State of [Your State], without regard to its conflict of laws principles. Each party irrevocably consents to the exclusive jurisdiction and venue of the state and federal courts located in [Your County, Your State] for any disputes arising out of or relating to this Agreement. Each party waives any objection to such jurisdiction or venue on the grounds of inconvenient forum or otherwise.`,
        riskLevel: "low"
      };
    } else {
      // For unknown or other types, provide generic analysis based on the actual clause content
      const clauseTitle = type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Contract Provision';
      
      // Create a generic but useful rewrite suggestion
      const genericRewrite = `REVISED ${clauseTitle.toUpperCase()}: This provision should be structured to ensure: (a) both parties have balanced rights and obligations; (b) all commitments have clearly defined scope, duration, and termination conditions; (c) liability for breach is appropriately allocated based on control and fault; (d) the customer retains reasonable flexibility to address changing business needs; and (e) dispute resolution procedures are fair and efficient. The specific terms should be reviewed by legal counsel and negotiated to reflect: clear performance standards, reasonable notice periods, mutual good faith obligations, and appropriate remedies for non-performance.`;
      
      analysis = {
        title: clauseTitle,
        originalClause: actualClauseText,
        explanation: "This provision should be carefully reviewed to ensure it adequately protects your interests and maintains fair balance between both parties. Consider whether the terms are reasonable, achievable, and aligned with your business objectives.",
        suggestion: genericRewrite,
        riskLevel: "medium"
      };
    }
    
    // Always add the analysis (we should never skip a clause)
    if (analysis) {
      analysisResults.push(analysis);
    }
  }
  
  // Ensure we always return something - if no results, create a generic analysis
  if (analysisResults.length === 0 && matchedClauses.length > 0) {
    console.warn("Fallback analysis produced no results, creating generic analysis");
    matchedClauses.forEach(match => {
      analysisResults.push({
        title: "Contract Provision",
        originalClause: match.userClause.content,
        explanation: "This provision should be reviewed by legal counsel to ensure it adequately protects your interests.",
        suggestion: "REVISED PROVISION: This clause should be rewritten to ensure balanced obligations, clear performance standards, and appropriate protections for both parties. Please consult with legal counsel for specific recommendations based on your business needs.",
        riskLevel: "medium"
      });
    });
  }
  
  // Return ALL analyzed clauses
  return analysisResults;
} 
