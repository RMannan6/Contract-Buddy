import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ() {
  return (
    <div className="mb-16">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
      
      <Accordion type="single" collapsible className="space-y-4">
        <AccordionItem value="item-1" className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <h3 className="text-base font-medium text-slate-900">Is ContractBuddy providing legal advice?</h3>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            <p className="text-slate-600">No, ContractBuddy is not a substitute for legal advice. Our AI provides suggestions based on analysis of contract terms, but you should always consult with a qualified attorney for legal matters.</p>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="item-2" className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <h3 className="text-base font-medium text-slate-900">How secure is my contract data?</h3>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            <p className="text-slate-600">Your privacy and security are our top priorities. All uploaded contracts are automatically deleted after 24 hours. We use bank-level encryption to protect your data, and we never share your contract information with third parties.</p>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="item-3" className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <h3 className="text-base font-medium text-slate-900">What types of contracts can I analyze?</h3>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            <p className="text-slate-600">ContractBuddy works with a wide range of commercial contracts including service agreements, software licenses, NDAs, employment contracts, and more. Our system is continuously improving to handle additional contract types.</p>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="item-4" className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <h3 className="text-base font-medium text-slate-900">How accurate is the AI analysis?</h3>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            <p className="text-slate-600">Our AI has been trained on thousands of contracts and achieves high accuracy in identifying standard clauses and potential issues. However, like any AI tool, it works best as a complement to human expertise, not a replacement.</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
