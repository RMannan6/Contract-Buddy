import PDFDocument from "pdfkit";
import { NegotiationPoint } from "@shared/schema";

/**
 * Generates a PDF analysis report
 * 
 * @param negotiationPoints The analysis points with suggested improvements
 * @param partyInfo Information about the contract parties
 * @param documentId The document ID
 * @returns A Buffer containing the PDF document
 */
export async function generateAnalysisReport(
  negotiationPoints: NegotiationPoint[],
  partyInfo: {
    userPartyType: string | null;
    party1Name: string | null;
    party2Name: string | null;
    userSelectedParty: string | null;
  } | null,
  documentId: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'LETTER'
      });
      
      const buffers: Buffer[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
      
      // Add title
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text('Contract Analysis Report', { align: 'center' });
      
      doc.moveDown();
      
      // Add generation date
      doc.fontSize(10)
         .font('Helvetica-Oblique')
         .fillColor('#666666')
         .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
      
      doc.moveDown();
      
      // Add party information if available
      if (partyInfo && partyInfo.party1Name && partyInfo.party2Name) {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#000000')
           .text('Contract Parties:', { underline: true });
        
        doc.fontSize(10)
           .font('Helvetica')
           .text(`Party 1: ${partyInfo.party1Name}`, { indent: 20 });
        doc.text(`Party 2: ${partyInfo.party2Name}`, { indent: 20 });
        
        if (partyInfo.userSelectedParty) {
          const yourParty = partyInfo.userSelectedParty === 'party1' 
            ? partyInfo.party1Name 
            : partyInfo.party2Name;
          doc.text(`Your Role: ${yourParty} (${partyInfo.userPartyType === 'drafting' ? 'Drafting Party' : 'Adverse Party'})`, { indent: 20 });
        }
        
        doc.moveDown();
      }
      
      // Add disclaimer
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor('#B45309')
         .text('DISCLAIMER', { underline: true });
      
      doc.fontSize(9)
         .font('Helvetica-Oblique')
         .fillColor('#666666')
         .text('This is an AI-generated analysis meant for review purposes only. The suggestions provided are not legal advice. Always consult with a qualified attorney for legal matters.', { align: 'justify' });
      
      doc.moveDown(1.5);
      
      // Add negotiation points
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#000000')
         .text('Key Negotiation Points', { underline: true });
      
      doc.moveDown();
      
      // Process each negotiation point
      negotiationPoints.forEach((point, index) => {
        // Guard against missing data
        if (!point || !point.title) {
          return; // Skip malformed points
        }
        
        // Risk level color
        const riskColors: Record<string, string> = {
          high: '#DC2626',
          medium: '#F59E0B',
          low: '#10B981'
        };
        const riskColor = riskColors[point.riskLevel] || '#666666';
        
        // Add point number and title
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#000000')
           .text(`${index + 1}. ${point.title || 'Contract Provision'}`, { continued: false });
        
        // Add risk level
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor(riskColor)
           .text(`Risk Level: ${(point.riskLevel || 'medium').toUpperCase()}`, { indent: 20 });
        
        doc.moveDown(0.5);
        
        // Add explanation with safety check
        const explanation = point.explanation || 'No explanation provided.';
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#000000')
           .text('Why This Matters:', { indent: 20 });
        
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#374151')
           .text(explanation, { 
             indent: 30,
             align: 'justify'
           });
        
        doc.moveDown(0.5);
        
        // Add original clause with safety check
        const originalClause = point.originalClause || 'Original clause text not available.';
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#991B1B')
           .text('Original Clause:', { indent: 20 });
        
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#666666')
           .text(originalClause.substring(0, 500) + (originalClause.length > 500 ? '...' : ''), { 
             indent: 30,
             align: 'justify'
           });
        
        doc.moveDown(0.5);
        
        // Add suggested clause with safety check
        const suggestion = point.suggestion || 'Suggested clause text not available.';
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#166534')
           .text('Recommended Clause:', { indent: 20 });
        
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#666666')
           .text(suggestion.substring(0, 500) + (suggestion.length > 500 ? '...' : ''), { 
             indent: 30,
             align: 'justify'
           });
        
        // Add separator
        if (index < negotiationPoints.length - 1) {
          doc.moveDown();
          doc.strokeColor('#E5E7EB')
             .lineWidth(1)
             .moveTo(50, doc.y)
             .lineTo(550, doc.y)
             .stroke();
          doc.moveDown();
        }
        
        // Add new page if we're running out of space and not on the last item
        if (doc.y > 680 && index < negotiationPoints.length - 1) {
          doc.addPage();
        }
      });
      
      // Add footer on last page
      doc.fontSize(8)
         .font('Helvetica-Oblique')
         .fillColor('#999999')
         .text(
           `ContractBuddy Analysis Report - Document ID: ${documentId}`,
           50,
           doc.page.height - 50,
           { align: 'center' }
         );
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
