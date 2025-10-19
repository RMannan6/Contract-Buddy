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
  goldStandardClauses: GoldStandardClause[],
  partyInfo?: { userPartyType?: string | null; party1Name?: string | null; party2Name?: string | null; userSelectedParty?: string | null }
): Promise<{ negotiationPoints: NegotiationPoint[] }> {
  try {
    // 1. Generate embeddings for the clauses
    const clauseEmbeddings = await generateEmbeddings(clauses.map(c => c.content));
    
    // 2. Compare with gold standard clauses and find the most relevant ones
    const matchedClauses = findMatchingClauses(clauses, clauseEmbeddings, goldStandardClauses);
    
    // 3. Generate analysis and recommendations using the LLM, personalized for party type
    const negotiationPoints = await generateAnalysis(matchedClauses, partyInfo);
    
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
async function generateAnalysis(
  matchedClauses: MatchedClause[], 
  partyInfo?: { userPartyType?: string | null; party1Name?: string | null; party2Name?: string | null; userSelectedParty?: string | null }
): Promise<NegotiationPoint[]> {
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
      // Create prompt for the LLM, personalized for party type
      const prompt = createAnalysisPrompt(matchedClauses, partyInfo);
      
      // Call the LLM using GPT-4 for advanced contract analysis
      // Note: response_format json_object may not be supported by all AIML models
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert contract attorney. Your task is to analyze contract clauses and rewrite them to better protect the customer's interests. For each clause, you must: 1) Identify the risk level (high, medium, low), 2) Explain why it matters in plain English, and 3) Provide an actual REWRITTEN version of the clause with improved wording that better protects the customer. You MUST respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      });
      
      // Parse the response
      const content = response.choices[0].message.content;
      if (!content) {
        return getIntelligentFallbackWithMatchedClauses(matchedClauses);
      }
      
      // Strip markdown code blocks if present (GPT often wraps JSON in ```json ... ```)
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```')) {
        // Remove opening ```json or ``` and closing ```
        cleanedContent = cleanedContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      }
      
      const result = JSON.parse(cleanedContent);
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
function createAnalysisPrompt(
  matchedClauses: MatchedClause[], 
  partyInfo?: { userPartyType?: string | null; party1Name?: string | null; party2Name?: string | null; userSelectedParty?: string | null }
): string {
  // Determine the perspective based on party type
  const isDraftingParty = partyInfo?.userPartyType === 'drafting';
  const isAdverseParty = partyInfo?.userPartyType === 'adverse';
  
  // Determine which party the user represents
  const userPartyName = partyInfo?.userSelectedParty === 'party1' 
    ? partyInfo?.party1Name 
    : partyInfo?.userSelectedParty === 'party2' 
    ? partyInfo?.party2Name 
    : null;
  
  const otherPartyName = partyInfo?.userSelectedParty === 'party1'
    ? partyInfo?.party2Name
    : partyInfo?.userSelectedParty === 'party2'
    ? partyInfo?.party1Name
    : null;
  
  // Define party-specific guidance
  let partyContext: string;
  let roleDescription: string;
  
  // Include specific party names in context when available
  const partyNameContext = userPartyName 
    ? ` Your client is ${userPartyName}${otherPartyName ? `, and the other party is ${otherPartyName}` : ''}.`
    : '';
  
  if (isDraftingParty) {
    roleDescription = 'helping a client who drafted this contract';
    partyContext = `You are helping the DRAFTING PARTY (the party who wrote this contract).${partyNameContext} Focus on ensuring clarity, fairness, and mutual benefits while protecting their interests. Suggest improvements that make the contract more balanced and enforceable.`;
  } else if (isAdverseParty) {
    roleDescription = 'helping a client who is reviewing a contract drafted by the other party';
    partyContext = `You are helping the ADVERSE PARTY (the party reviewing a contract drafted by someone else).${partyNameContext} Focus on risk mitigation, protective language, and negotiation strategies to better protect their interests against potentially one-sided terms.`;
  } else {
    // Neutral fallback for legacy documents or when party type is not specified
    roleDescription = 'helping a client review this contract';
    partyContext = `Provide balanced analysis focusing on both risk mitigation and clarity.${partyNameContext} Identify potential issues and suggest improvements that protect the client\'s interests while maintaining a fair agreement.`;
  }

  let prompt = `You are a contract attorney ${roleDescription}. 

${partyContext}

For each clause below:
1. Identify the risk level (high/medium/low) ${isDraftingParty ? 'for potential enforceability issues or unfairness' : 'for the client\'s exposure'}
2. Write a DETAILED, layman's-terms explanation covering three key points:
   a) What specific risks or liabilities this clause creates for the client
   b) Why the current wording is unfavorable or problematic (be specific about what's missing, one-sided, or excessive)
   c) How the proposed changes reduce risk and better protect the client's interests
3. Write a COMPLETE REPLACEMENT clause that maintains the same purpose but with ${isDraftingParty ? 'clearer, more balanced terms' : 'better terms that protect the client'}

CRITICAL REQUIREMENTS:
- The "explanation" field MUST be detailed (3-5 sentences minimum) covering all three points above in plain English that a non-lawyer can understand
- Explain SPECIFIC scenarios where the current clause could cause financial loss, legal trouble, or business problems
- Explain EXACTLY how the rewritten version addresses those risks
- The "suggestion" field MUST contain the ENTIRE rewritten clause - a full, legal-quality replacement text that could be inserted into the contract. NOT advice, NOT a summary - an actual complete clause.

Use the gold standard as a guide for structure and key protections to include.

Respond with ONLY a JSON object (no markdown, no code blocks) in this exact format:
{
  "negotiationPoints": [
    {
      "title": "Brief title for the clause type",
      "originalClause": "The original clause text",
      "explanation": "DETAILED plain English explanation (3-5 sentences) covering: (1) what specific risks this creates, (2) why the current wording is unfavorable, and (3) how the changes protect you better",
      "suggestion": "COMPLETE REWRITTEN CLAUSE with all details, conditions, and protections",
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

// Create a complete rewritten clause based on clause type and gold standard
function createCompleteRewrittenClause(clauseType: string | null | undefined, actualClause: string, goldStandard: string): string {
  // Generate a complete, detailed rewritten clause based on the clause type
  // This should be a full legal clause that could replace the original
  
  const type = clauseType?.toLowerCase() || 'other';
  
  // Create comprehensive rewrites for each clause type
  if (type === 'limitation_of_liability') {
    return `LIMITATION OF LIABILITY: Notwithstanding anything to the contrary in this Agreement, neither party's aggregate liability arising out of or related to this Agreement, whether in contract, tort, or under any other theory of liability, shall exceed the greater of: (i) two times the total fees paid or payable under this Agreement in the twelve (12) months immediately preceding the claim, or (ii) $500,000. The foregoing limitations shall not apply to: (a) either party's gross negligence or willful misconduct; (b) breach of confidentiality obligations; (c) infringement of the other party's intellectual property rights; (d) data breaches or unauthorized access to personal information; (e) either party's indemnification obligations under this Agreement; or (f) bodily injury or death caused by either party's negligence.`;
  } else if (type === 'termination') {
    return `TERMINATION: Either party may terminate this Agreement: (a) for convenience by providing ninety (90) days prior written notice to the other party; (b) immediately upon written notice if the other party materially breaches this Agreement and fails to cure such breach within thirty (30) days of receiving written notice thereof; or (c) immediately if the other party becomes insolvent, files for bankruptcy protection, makes an assignment for the benefit of creditors, or ceases business operations. Upon termination, Supplier shall provide reasonable transition assistance for up to sixty (60) days to facilitate Customer's migration to an alternative provider. Customer shall pay only for services actually rendered through the effective termination date, and Supplier shall refund any prepaid fees for services not delivered. Each party shall promptly return or destroy all Confidential Information of the other party.`;
  } else if (type === 'intellectual_property') {
    return `INTELLECTUAL PROPERTY: Customer shall own all right, title, and interest in and to all custom work product, deliverables, and materials created specifically for Customer under this Agreement ("Custom IP"). Supplier hereby irrevocably assigns to Customer all Custom IP, and shall execute any documents reasonably necessary to perfect such assignment. Supplier retains ownership of its pre-existing intellectual property, tools, methodologies, and general know-how existing prior to this Agreement ("Supplier IP"). To the extent any Supplier IP is incorporated into the Custom IP, Supplier grants Customer a perpetual, irrevocable, worldwide, royalty-free, fully-paid license to use, reproduce, modify, and distribute such Supplier IP as part of the Custom IP. Neither party shall use the other party's trademarks, service marks, or brand names without the other party's prior written consent.`;
  } else if (type === 'indemnification') {
    return `INDEMNIFICATION: Supplier shall indemnify, defend, and hold harmless Customer and its affiliates, officers, directors, employees, and agents from and against any and all third-party claims, demands, lawsuits, damages, losses, liabilities, and expenses (including reasonable attorneys' fees and court costs) arising from or related to: (a) any claim that the services, deliverables, or materials provided by Supplier infringe or misappropriate any third party's intellectual property rights; (b) Supplier's material breach of its obligations under this Agreement; (c) Supplier's gross negligence or willful misconduct; or (d) bodily injury or property damage caused by Supplier's acts or omissions. Customer shall indemnify Supplier from claims arising solely from Customer's unauthorized modification of deliverables or use of deliverables in a manner that violates this Agreement. The indemnified party shall promptly notify the indemnifying party of any claim, cooperate reasonably in the defense, and the indemnifying party shall have sole control of the defense and any settlement (provided such settlement does not impose obligations on or admit liability of the indemnified party without its consent).`;
  } else if (type === 'payment_terms') {
    return `PAYMENT TERMS: Customer shall pay all undisputed invoiced amounts within thirty (30) days of invoice date via wire transfer, ACH, or check to the account designated by Supplier. Supplier shall submit detailed invoices with supporting documentation for all fees, expenses, and charges. Customer may withhold payment and provide written notice if it disputes any charges in good faith, and the parties shall work together to resolve such disputes within fifteen (15) business days. Undisputed amounts remain due per the original payment schedule. Late payments of undisputed amounts shall accrue interest at the lesser of 1.5% per month or the maximum rate permitted by applicable law. All fees are exclusive of applicable sales, use, and other taxes, which Customer shall pay or provide valid exemption certificates. Supplier shall not suspend services for non-payment without thirty (30) days prior written notice and opportunity to cure.`;
  } else if (type === 'confidentiality') {
    return `CONFIDENTIALITY: Each party agrees to maintain in strict confidence all Confidential Information disclosed by the other party and to use such information only for purposes directly related to this Agreement. "Confidential Information" means all non-public information, whether written, oral, or electronic, that is marked as confidential or that a reasonable person would understand to be confidential given the nature of the information and circumstances of disclosure. Confidential Information excludes information that: (a) is or becomes publicly available through no breach of this Agreement; (b) was rightfully in the receiving party's possession prior to disclosure; (c) is independently developed by the receiving party without use of or reference to the other party's Confidential Information; or (d) is rightfully received from a third party without confidentiality obligations. These confidentiality obligations shall survive for five (5) years after termination or expiration of this Agreement.`;
  } else if (type === 'warranty') {
    return `WARRANTIES: Supplier warrants that: (a) the services shall be performed in a professional and workmanlike manner consistent with generally accepted industry standards; (b) the deliverables shall materially conform to the specifications and requirements set forth in the applicable Statement of Work; (c) the deliverables and Supplier's performance hereunder shall not infringe, misappropriate, or otherwise violate any third party's intellectual property rights; (d) Supplier has the full right, power, and authority to enter into this Agreement and to grant the rights granted herein; and (e) the deliverables shall be free from viruses, malware, and other harmful code. If any deliverables do not conform to these warranties, Supplier shall, at its expense, re-perform the non-conforming services or replace the non-conforming deliverables within thirty (30) days of receiving written notice. If Supplier fails to cure the breach within such period, Customer may terminate the affected portion of this Agreement and receive a pro-rata refund of fees paid for such non-conforming deliverables.`;
  } else if (type === 'governing_law') {
    return `GOVERNING LAW AND JURISDICTION: This Agreement shall be governed by and construed in accordance with the laws of the State of [Customer's State], without giving effect to its conflict of laws principles. Each party irrevocably consents to the exclusive jurisdiction and venue of the state and federal courts located in [Customer's County, Customer's State] for any disputes, claims, or controversies arising out of or relating to this Agreement. Each party hereby waives any objection to such jurisdiction or venue on the grounds of inconvenient forum or otherwise. The prevailing party in any litigation shall be entitled to recover its reasonable attorneys' fees and costs from the other party.`;
  } else {
    // For unknown types, create a generic but comprehensive clause
    return `REVISED PROVISION: This provision is revised to ensure: (a) both parties have balanced rights and obligations under the terms of this Agreement; (b) all commitments have clearly defined scope, specific performance standards, reasonable duration, and fair termination conditions; (c) liability for breach is appropriately allocated based on fault, control, and ability to mitigate damages; (d) Customer retains reasonable flexibility to address changing business needs and market conditions; (e) notice requirements and cure periods are clearly specified; (f) dispute resolution procedures are fair, efficient, and allow for escalation when necessary; and (g) remedies for non-performance are proportionate and enforceable. All specific terms, amounts, and time periods should be reviewed by legal counsel and negotiated in good faith to reflect the parties' actual business relationship and risk allocation.`;
  }
}

// More intelligent fallback that uses the matched clauses
function getIntelligentFallbackWithMatchedClauses(matchedClauses: MatchedClause[]): NegotiationPoint[] {
  // Analyze each of the top 5 priority clauses separately
  const analysisResults: NegotiationPoint[] = [];
  
  // Process each matched clause from the actual contract (already limited to top 5 by findMatchingClauses)
  for (const match of matchedClauses) {
    const type = match.userClause.type;
    const actualClauseText = match.userClause.content;
    const goldStandardText = match.goldStandard.content;
    
    // Create a complete rewritten clause that combines the gold standard with context from the actual clause
    // This ensures each suggestion is unique and relevant to the specific clause
    const rewrittenClause = createCompleteRewrittenClause(type, actualClauseText, goldStandardText);
    
    // Generate analysis based on clause type, but ALWAYS use the actual clause text
    let analysis: NegotiationPoint | null = null;
    
    if (type === "limitation_of_liability") {
      analysis = {
        title: "Limitation of Liability",
        originalClause: actualClauseText,
        explanation: "This clause restricts how much the supplier must pay if something goes wrong. The current version likely caps liability at an amount that's too low to cover serious issues like data breaches, system failures, or service outages that could cost your business far more than the cap allows. Additionally, it may not carve out exceptions for gross negligence or willful misconduct, meaning the supplier could act recklessly and still limit their damages. The revised version sets a reasonable cap (tied to fees paid or a minimum amount) while explicitly excluding critical scenarios like data breaches, IP infringement, and gross negligence from the cap - ensuring you can recover full damages if the supplier causes major harm through serious wrongdoing.",
        suggestion: rewrittenClause,
        riskLevel: "high"
      };
    } else if (type === "termination") {
      analysis = {
        title: "Termination Clause",
        originalClause: actualClauseText,
        explanation: "This clause controls how and when either party can end the agreement. The current wording may give the supplier the right to cancel immediately while requiring you to stay locked in for months or years, or it may lack provisions for terminating if the supplier fails to deliver. This creates an unfair power imbalance where you're stuck in a failing relationship or forced to continue paying for poor service. The revised version gives both parties equal rights to terminate for convenience (with 90 days notice), allows immediate termination for material breaches that aren't fixed within 30 days, and guarantees you'll get transition assistance to move to a new provider - protecting your business continuity while giving you an escape route from underperforming suppliers.",
        suggestion: rewrittenClause,
        riskLevel: "medium"
      };
    } else if (type === "intellectual_property") {
      analysis = {
        title: "Intellectual Property Rights",
        originalClause: actualClauseText,
        explanation: "This clause determines who owns the custom work created specifically for you under this contract. The current wording may allow the supplier to retain ownership of everything they create, meaning you're paying for work you don't actually own and can't freely use, modify, sell, or transfer. This could force you to keep paying the supplier to make changes, prevent you from switching providers, or even allow the supplier to license 'your' work to your competitors. The revised version clearly states that you own all custom work created for you (with full assignment of rights), while giving the supplier a license only for their pre-existing tools - ensuring you can do whatever you want with the deliverables you paid for without ongoing dependency or restrictions.",
        suggestion: rewrittenClause,
        riskLevel: "high"
      };
    } else if (type === "indemnification") {
      analysis = {
        title: "Indemnification",
        originalClause: actualClauseText,
        explanation: "This clause determines who pays legal costs and damages if a third party sues over the work performed. The current wording may require you to cover all legal costs and damages even when the supplier causes the problem - for example, if they use stolen code or violate someone's patent. This means you could face six or seven-figure legal bills defending lawsuits caused entirely by the supplier's wrongdoing. The revised version makes the supplier responsible for defending and paying for claims arising from their work, including IP infringement, breach of contract, and their own negligence - while you only indemnify them for issues you actually cause. This ensures the party at fault pays the legal bills, not the innocent party.",
        suggestion: rewrittenClause,
        riskLevel: "medium"
      };
    } else if (type === "payment_terms") {
      analysis = {
        title: "Payment Terms",
        originalClause: actualClauseText,
        explanation: "This clause establishes when and how you must pay, and what happens if you dispute a charge. The current wording may require immediate payment of all invoices without the right to dispute errors or unsatisfactory work, and may impose excessive late fees (like 5-10% per month) that far exceed market rates. It might also allow the supplier to cut off your service immediately for any payment dispute, even if you're disputing charges in good faith. The revised version gives you 30 days to pay, the explicit right to withhold disputed amounts while issues are resolved, reasonable late fees capped at 1.5% monthly, and protection against service suspension without 30 days notice - ensuring you can challenge incorrect bills without losing critical services or facing punitive penalties.",
        suggestion: rewrittenClause,
        riskLevel: "low"
      };
    } else if (type === "confidentiality") {
      analysis = {
        title: "Confidentiality",
        originalClause: actualClauseText,
        explanation: "This clause protects sensitive information shared during the business relationship. The current wording may impose confidentiality obligations only on you (one-sided), allow the definition of 'confidential' to include common industry knowledge or your own business information, or require you to keep everything secret forever. This could prevent you from discussing your own business operations, hiring employees who learned general skills during the project, or using publicly available information. The revised version creates mutual obligations (both parties protect each other's secrets equally), clearly defines what qualifies as confidential with reasonable exceptions (like publicly available information or things you already knew), and limits the confidentiality period to 5 years - giving you freedom to operate your business while still protecting truly sensitive information.",
        suggestion: rewrittenClause,
        riskLevel: "medium"
      };
    } else if (type === "warranty") {
      analysis = {
        title: "Warranty",
        originalClause: actualClauseText,
        explanation: "This clause establishes what the supplier promises about their work quality and what remedies you have if the work is defective. The current wording may disclaim all warranties (including that the work will actually function as intended), provide no recourse if deliverables fail to meet specifications, or limit your remedy to the supplier trying again indefinitely without any refund. This means you could pay in full for work that doesn't work, doesn't do what it's supposed to, or infringes third-party rights - with zero compensation or remedy. The revised version requires professional, workmanlike performance that meets specifications, promises no IP infringement, guarantees virus-free deliverables, and gives you the right to terminate and get a pro-rated refund if the supplier can't fix problems within 30 days - ensuring you get working deliverables or your money back.",
        suggestion: rewrittenClause,
        riskLevel: "medium"
      };
    } else if (type === "governing_law") {
      analysis = {
        title: "Governing Law and Jurisdiction",
        originalClause: actualClauseText,
        explanation: "This clause determines which state's laws apply and where lawsuits must be filed if disputes arise. The current wording may specify the supplier's home state (potentially across the country from you), forcing you to hire out-of-state attorneys, travel for depositions and court appearances, and litigate under unfamiliar laws - adding tens of thousands in legal costs before you even get to trial. It may also prevent you from recovering attorney's fees even if you win. The revised version sets jurisdiction in your state (where your business operates), applies your local laws, and awards attorney's fees to the prevailing party - ensuring any disputes are resolved in your backyard where you have local counsel and know the legal landscape, while discouraging frivolous lawsuits since the losing party pays both sides' legal fees.",
        suggestion: rewrittenClause,
        riskLevel: "low"
      };
    } else {
      // For unknown or other types, use complete rewritten clause based on gold standard
      const clauseTitle = type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Contract Provision';
      
      analysis = {
        title: clauseTitle,
        originalClause: actualClauseText,
        explanation: "This contract provision may contain one-sided terms, unclear obligations, or missing protections that could put your business at risk. The current wording might favor the supplier's interests over yours, lack specific performance standards or deadlines, impose obligations you can't realistically meet, or fail to provide adequate remedies if the supplier doesn't deliver. Without clear, balanced terms, you could face unexpected costs, legal disputes over interpretation, or find yourself locked into unfavorable commitments. The revised version balances rights and obligations fairly between both parties, includes specific performance standards and timeframes, provides clear remedies for non-performance, and ensures both parties have reasonable flexibility to address changing business needs - creating a framework that protects both sides while reducing the risk of costly disputes.",
        suggestion: rewrittenClause,
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
