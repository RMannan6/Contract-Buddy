import { NegotiationPoint, Clause } from "@shared/schema";
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from "docx";

/**
 * Generates a revised contract as a Word document by replacing original clauses with suggested improvements
 * 
 * @param originalText The full text of the original contract
 * @param negotiationPoints The analysis points with suggested improvements
 * @param clauses The extracted clauses from the original document
 * @returns A Buffer containing the Word document
 */
export async function generateRevisedContract(
  originalText: string,
  negotiationPoints: NegotiationPoint[],
  clauses: Clause[]
): Promise<Buffer> {
  let revisedText = originalText;
  
  // Only use the top negotiation points (we focus on the 5 most important changes)
  const topPoints = negotiationPoints.slice(0, 5);
  
  // Process each negotiation point
  for (const point of topPoints) {
    const originalClause = point.originalClause;
    const improvedClause = point.suggestion;
    
    // Replace the original clause with the suggested improvement
    if (originalClause && improvedClause) {
      revisedText = revisedText.replace(originalClause, improvedClause);
    }
  }
  
  // Create Word document
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Header
        new Paragraph({
          text: "REVISED CONTRACT WITH RECOMMENDED IMPROVEMENTS",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Generated on: ${new Date().toLocaleString()}`,
              italics: true
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "DISCLAIMER",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "This is an AI-generated document meant for review purposes only. Please consult with legal counsel before finalizing any contract. The revisions below implement the suggestions provided in your contract analysis.",
              italics: true
            })
          ],
          spacing: { after: 400 }
        }),
        new Paragraph({
          text: "REVISED CONTRACT",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 }
        }),
        // Contract content - split by paragraphs
        ...revisedText.split(/\n\s*\n/).map(para => 
          new Paragraph({
            text: para.trim(),
            spacing: { after: 200 }
          })
        )
      ]
    }]
  });
  
  return await Packer.toBuffer(doc);
}

/**
 * Generates a revised contract with tracked changes as a Word document
 * 
 * @param originalText The full text of the original contract
 * @param negotiationPoints The analysis points with suggested improvements
 * @param clauses The extracted clauses from the original document
 * @returns A Buffer containing the Word document with tracked changes
 */
export async function generateRevisedContractWithChanges(
  originalText: string,
  negotiationPoints: NegotiationPoint[],
  clauses: Clause[]
): Promise<Buffer> {
  // Only use the top negotiation points
  const topPoints = negotiationPoints.slice(0, 5);
  
  const paragraphElements: Paragraph[] = [];
  
  // Add header
  paragraphElements.push(
    new Paragraph({
      text: "REVISED CONTRACT WITH TRACKED CHANGES",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated on: ${new Date().toLocaleString()}`,
          italics: true
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      text: "DISCLAIMER",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "This is an AI-generated document meant for review purposes only. Please consult with legal counsel before finalizing any contract. The revisions below show tracked changes with explanations.",
          italics: true
        })
      ],
      spacing: { after: 400 }
    }),
    new Paragraph({
      text: "ORIGINAL CONTRACT",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 200 }
    })
  );
  
  // Add the original contract text
  const originalParagraphs = originalText.split(/\n\s*\n/);
  for (const para of originalParagraphs) {
    if (para.trim()) {
      paragraphElements.push(
        new Paragraph({
          text: para.trim(),
          spacing: { after: 200 }
        })
      );
    }
  }
  
  // Add tracked changes section
  paragraphElements.push(
    new Paragraph({
      text: "SUGGESTED CHANGES WITH EXPLANATIONS",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 }
    })
  );
  
  // Process each negotiation point
  for (let i = 0; i < topPoints.length; i++) {
    const point = topPoints[i];
    
    // Skip if missing essential data
    if (!point.originalClause || !point.suggestion || !point.explanation) {
      continue;
    }
    
    // Add change number
    paragraphElements.push(
      new Paragraph({
        text: `CHANGE ${i + 1}: ${point.title || 'Contract Provision'}`,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 300, after: 100 }
      })
    );
    
    // Add risk level
    const riskColor = point.riskLevel === 'high' ? 'FF0000' : 
                     point.riskLevel === 'medium' ? 'FFA500' : '008000';
    paragraphElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "RISK LEVEL: ",
            bold: true
          }),
          new TextRun({
            text: point.riskLevel.toUpperCase(),
            bold: true,
            color: riskColor
          })
        ],
        spacing: { after: 200 }
      })
    );
    
    // Show removed text with strikethrough
    paragraphElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "ORIGINAL (TO BE REMOVED): ",
            bold: true,
            color: "990000"
          })
        ],
        spacing: { after: 50 }
      })
    );
    
    paragraphElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: point.originalClause,
            strike: true,
            color: "990000"
          })
        ],
        spacing: { after: 200 }
      })
    );
    
    // Show added text with highlight
    paragraphElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "SUGGESTED (TO BE ADDED): ",
            bold: true,
            color: "006600"
          })
        ],
        spacing: { after: 50 }
      })
    );
    
    paragraphElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: point.suggestion,
            color: "006600",
            highlight: "yellow"
          })
        ],
        spacing: { after: 200 }
      })
    );
    
    // Add explanation
    paragraphElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "WHY THIS MATTERS: ",
            bold: true,
            italics: true
          })
        ],
        spacing: { after: 50 }
      })
    );
    
    paragraphElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: point.explanation,
            italics: true
          })
        ],
        spacing: { after: 300 }
      })
    );
    
    // Add separator
    if (i < topPoints.length - 1) {
      paragraphElements.push(
        new Paragraph({
          text: "─".repeat(80),
          spacing: { before: 100, after: 100 }
        })
      );
    }
  }
  
  const doc = new Document({
    sections: [{
      properties: {},
      children: paragraphElements
    }]
  });
  
  return await Packer.toBuffer(doc);
}
