import snowflakeDb from './snowflake-db';
import { Clause } from '../shared/schema';
import path from 'path';

const STAGE_NAME = 'CONTRACT_UPLOADS';

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

interface DocumentAIClause {
  content: string;
  type: string;
  position: number;
  risk_level?: string;
}

/**
 * Get safe file extension from MIME type
 */
function getSafeExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: { [key: string]: string } = {
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'image/jpeg': '.jpg',
    'image/png': '.png'
  };
  return mimeToExt[mimeType] || '.bin';
}

/**
 * Upload a document to Snowflake stage and analyze it with Document AI
 */
export async function analyzeDocumentWithAI(
  filePath: string,
  fileName: string,
  documentId: number,
  mimeType: string
): Promise<{ clauses: DocumentAIClause[], fullText: string }> {
  // Use document ID and MIME type-derived extension to avoid SQL injection
  const safeExtension = getSafeExtensionFromMimeType(mimeType);
  const safeStageFilePath = `doc_${documentId}${safeExtension}`;
  
  try {
    console.log(`Uploading file to Snowflake stage: ${safeStageFilePath}`);
    
    // Upload file to Snowflake stage
    await snowflakeDb.uploadFileToStage(filePath, STAGE_NAME, safeStageFilePath);
    
    console.log(`Analyzing document with Document AI model...`);
    
    // Call Document AI PREDICT function
    const result = await snowflakeDb.predictWithDocumentAI(STAGE_NAME, safeStageFilePath);
    
    if (!result || !result.PREDICTION) {
      throw new Error('Document AI returned no prediction results');
    }
    
    console.log('Document AI prediction result:', JSON.stringify(result, null, 2));
    
    // Parse the prediction result
    const prediction = typeof result.PREDICTION === 'string' 
      ? JSON.parse(result.PREDICTION) 
      : result.PREDICTION;
    
    // Extract clauses and full text from prediction
    const { clauses, fullText } = parseDocumentAIPrediction(prediction);
    
    // Select top 5 highest priority clauses
    const top5Clauses = selectTop5Clauses(clauses);
    
    console.log(`Document AI extracted ${clauses.length} clauses, selected top ${top5Clauses.length} for analysis`);
    
    return {
      clauses: top5Clauses,
      fullText: fullText || ''
    };
    
  } catch (error) {
    console.error('Error analyzing document with Document AI:', error);
    throw error;
  } finally {
    // Clean up staged file after processing
    try {
      await snowflakeDb.removeFileFromStage(STAGE_NAME, safeStageFilePath);
      console.log(`Cleaned up staged file: ${safeStageFilePath}`);
    } catch (cleanupError) {
      console.error('Error cleaning up staged file:', cleanupError);
      // Don't fail the whole operation if cleanup fails
    }
  }
}

/**
 * Parse Document AI prediction results to extract clauses
 */
function parseDocumentAIPrediction(prediction: any): { clauses: DocumentAIClause[], fullText: string } {
  const clauses: DocumentAIClause[] = [];
  let fullText = '';
  
  try {
    // Document AI typically returns structured data with sections/clauses
    // The exact structure depends on the model configuration
    // Common formats include:
    // - { pages: [...], entities: [...], clauses: [...] }
    // - { document: { text: "...", sections: [...] } }
    // - { content: "...", analysis: { clauses: [...] } }
    
    // Extract full text
    if (prediction.document?.text) {
      fullText = prediction.document.text;
    } else if (prediction.content) {
      fullText = prediction.content;
    } else if (prediction.text) {
      fullText = prediction.text;
    } else if (prediction.pages) {
      // Concatenate text from all pages
      fullText = prediction.pages
        .map((page: any) => page.text || page.content || '')
        .join('\n');
    }
    
    // Extract clauses
    if (prediction.clauses && Array.isArray(prediction.clauses)) {
      // Direct clauses array
      clauses.push(...prediction.clauses.map((clause: any, index: number) => ({
        content: clause.text || clause.content || '',
        type: identifyClauseType(clause.text || clause.content || '', clause.type),
        position: index,
        risk_level: clause.risk_level || assessRiskLevel(clause.type)
      })));
    } else if (prediction.entities && Array.isArray(prediction.entities)) {
      // Entities that may represent clauses
      const clauseEntities = prediction.entities.filter((entity: any) => 
        entity.type?.toLowerCase().includes('clause') || 
        entity.category?.toLowerCase().includes('clause')
      );
      
      clauses.push(...clauseEntities.map((entity: any, index: number) => ({
        content: entity.text || entity.content || entity.mention_text || '',
        type: identifyClauseType(entity.text || '', entity.type),
        position: index,
        risk_level: entity.risk_level || assessRiskLevel(entity.type)
      })));
    } else if (prediction.sections && Array.isArray(prediction.sections)) {
      // Document sections that may be clauses
      clauses.push(...prediction.sections.map((section: any, index: number) => ({
        content: section.text || section.content || '',
        type: identifyClauseType(section.text || section.content || '', section.heading),
        position: index,
        risk_level: section.risk_level || assessRiskLevel(section.type)
      })));
    } else if (prediction.document?.sections) {
      // Nested sections
      clauses.push(...prediction.document.sections.map((section: any, index: number) => ({
        content: section.text || section.content || '',
        type: identifyClauseType(section.text || section.content || '', section.heading),
        position: index,
        risk_level: section.risk_level || assessRiskLevel(section.type)
      })));
    }
    
    // If no clauses found but we have full text, extract clauses from text
    if (clauses.length === 0 && fullText) {
      console.log('No structured clauses found, falling back to text-based extraction');
      const extractedClauses = extractClausesFromText(fullText);
      clauses.push(...extractedClauses);
    }
    
  } catch (error) {
    console.error('Error parsing Document AI prediction:', error);
  }
  
  return { clauses, fullText };
}

/**
 * Extract clauses from plain text using heuristics
 */
function extractClausesFromText(text: string): DocumentAIClause[] {
  const clauses: DocumentAIClause[] = [];
  
  // Split by common clause separators (numbered sections, paragraphs)
  const sections = text.split(/\n\s*\n|\n(?=\d+\.|\([a-z]\))/);
  
  sections.forEach((section, index) => {
    const trimmed = section.trim();
    if (trimmed.length > 50) { // Ignore very short sections
      const type = identifyClauseType(trimmed);
      clauses.push({
        content: trimmed,
        type,
        position: index,
        risk_level: assessRiskLevel(type)
      });
    }
  });
  
  return clauses;
}

/**
 * Identify clause type based on content and hints
 */
function identifyClauseType(content: string, hint?: string): string {
  const lowerContent = content.toLowerCase();
  const lowerHint = hint?.toLowerCase() || '';
  
  // Check hint first
  if (lowerHint.includes('liability') || lowerHint.includes('limitation')) {
    return 'limitation_of_liability';
  }
  if (lowerHint.includes('indemnif')) {
    return 'indemnification';
  }
  if (lowerHint.includes('intellectual') || lowerHint.includes('ip')) {
    return 'intellectual_property';
  }
  if (lowerHint.includes('terminat')) {
    return 'termination';
  }
  if (lowerHint.includes('payment') || lowerHint.includes('fee')) {
    return 'payment_terms';
  }
  if (lowerHint.includes('confidential')) {
    return 'confidentiality';
  }
  if (lowerHint.includes('warrant')) {
    return 'warranty';
  }
  
  // Check content
  if (lowerContent.includes('limitation of liability') || 
      (lowerContent.includes('liable') && lowerContent.includes('not exceed'))) {
    return 'limitation_of_liability';
  }
  if (lowerContent.includes('indemnif') || lowerContent.includes('hold harmless')) {
    return 'indemnification';
  }
  if (lowerContent.includes('intellectual property') || 
      lowerContent.includes('copyright') || 
      lowerContent.includes('patent') ||
      lowerContent.includes('trademark')) {
    return 'intellectual_property';
  }
  if (lowerContent.includes('terminat') || lowerContent.includes('cancel')) {
    return 'termination';
  }
  if (lowerContent.includes('payment') || 
      lowerContent.includes('fee') || 
      lowerContent.includes('invoice') ||
      lowerContent.includes('price')) {
    return 'payment_terms';
  }
  if (lowerContent.includes('confidential') || lowerContent.includes('proprietary')) {
    return 'confidentiality';
  }
  if (lowerContent.includes('warrant') && !lowerContent.includes('without warrant')) {
    return 'warranty';
  }
  if (lowerContent.includes('governing law') || lowerContent.includes('jurisdiction')) {
    return 'governing_law';
  }
  if (lowerContent.includes('assign')) {
    return 'assignment';
  }
  
  return 'other';
}

/**
 * Assess risk level based on clause type
 */
function assessRiskLevel(type?: string): string {
  const highRiskTypes = ['limitation_of_liability', 'indemnification', 'intellectual_property'];
  const mediumRiskTypes = ['termination', 'payment_terms', 'confidentiality'];
  
  if (!type) return 'low';
  
  if (highRiskTypes.includes(type)) return 'high';
  if (mediumRiskTypes.includes(type)) return 'medium';
  return 'low';
}

/**
 * Select top 5 clauses based on priority
 */
function selectTop5Clauses(clauses: DocumentAIClause[]): DocumentAIClause[] {
  // Sort by priority (highest risk first)
  const sorted = clauses.sort((a, b) => {
    const priorityA = CLAUSE_TYPE_PRIORITY[a.type] || 10;
    const priorityB = CLAUSE_TYPE_PRIORITY[b.type] || 10;
    return priorityA - priorityB;
  });
  
  // Return top 5
  return sorted.slice(0, 5);
}
