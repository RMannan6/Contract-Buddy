import { NegotiationPoint, Clause } from "@shared/schema";

/**
 * Generates a revised contract by replacing original clauses with suggested improvements
 * 
 * @param originalText The full text of the original contract
 * @param negotiationPoints The analysis points with suggested improvements
 * @param clauses The extracted clauses from the original document
 * @returns A string containing the revised contract with all suggested improvements applied
 */
export function generateRevisedContract(
  originalText: string,
  negotiationPoints: NegotiationPoint[],
  clauses: Clause[]
): string {
  let revisedText = originalText;
  
  // Only use the top negotiation points (we focus on the 5 most important changes)
  const topPoints = negotiationPoints.slice(0, 5);
  
  // Process each negotiation point
  for (const point of topPoints) {
    const originalClause = point.originalClause;
    const improvedClause = point.suggestion;
    
    // Replace the original clause with the suggested improvement
    // We use string replacement rather than positional editing to handle various document formats
    if (originalClause && improvedClause) {
      revisedText = revisedText.replace(originalClause, improvedClause);
    }
  }
  
  // Add a header to the revised contract
  const header = `
===== REVISED CONTRACT WITH RECOMMENDED IMPROVEMENTS =====
Generated on: ${new Date().toLocaleString()}

DISCLAIMER: This is an AI-generated document meant for review purposes only.
Please consult with legal counsel before finalizing any contract.
The revisions below implement the suggestions provided in your contract analysis.

===================================================

`;
  
  return header + revisedText;
}

/**
 * Generates a revised contract in Word-document-like format
 * 
 * @param originalText The full text of the original contract
 * @param negotiationPoints The analysis points with suggested improvements
 * @param clauses The extracted clauses from the original document
 * @returns A string containing the revised contract with all suggested improvements applied
 */
export function generateRevisedContractWithChanges(
  originalText: string,
  negotiationPoints: NegotiationPoint[],
  clauses: Clause[]
): string {
  let revisedText = '';
  
  // Only use the top negotiation points
  const topPoints = negotiationPoints.slice(0, 5);
  const pointMap = new Map<string, NegotiationPoint>();
  
  // Create a map for quick lookup
  for (const point of topPoints) {
    if (point.originalClause) {
      pointMap.set(point.originalClause, point);
    }
  }
  
  // Add a header to the revised contract
  revisedText += `
===== REVISED CONTRACT WITH TRACKED CHANGES =====
Generated on: ${new Date().toLocaleString()}

DISCLAIMER: This is an AI-generated document meant for review purposes only.
Please consult with legal counsel before finalizing any contract.
The revisions below implement the suggestions provided in your contract analysis.

===================================================

`;
  
  // Process the contract text paragraph by paragraph
  const paragraphs = originalText.split(/\n\s*\n/);
  
  for (const paragraph of paragraphs) {
    let paragraphWithChanges = paragraph;
    
    // Check if this paragraph contains any of the analyzed clauses
    // Using Array.from to avoid TypeScript iterator issues
    for (const entry of Array.from(pointMap.entries())) {
      const originalClause = entry[0];
      const point = entry[1];
      
      if (paragraph.includes(originalClause)) {
        // Show the change with strikethrough and the suggested improvement
        paragraphWithChanges = paragraph.replace(
          originalClause,
          `[ORIGINAL (REMOVED): ${originalClause}]\n\n[SUGGESTED (ADDED): ${point.suggestion}]`
        );
        
        // Add explanation of why this change matters
        paragraphWithChanges += `\n\n[WHY THIS MATTERS: ${point.explanation}]\n`;
        paragraphWithChanges += `[RISK LEVEL: ${point.riskLevel.toUpperCase()}]\n`;
      }
    }
    
    revisedText += paragraphWithChanges + '\n\n';
  }
  
  return revisedText;
}