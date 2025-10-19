import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PartyIdentificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: number;
  onComplete: () => void;
}

interface PartyExtractionResult {
  party1Name: string | null;
  party2Name: string | null;
  confidence: string;
  context: string;
}

export function PartyIdentificationDialog({ open, onOpenChange, documentId, onComplete }: PartyIdentificationDialogProps) {
  const [partyType, setPartyType] = useState<"drafting" | "adverse" | null>(null);
  const [party1Name, setParty1Name] = useState<string | null>(null);
  const [party2Name, setParty2Name] = useState<string | null>(null);
  const [selectedParty, setSelectedParty] = useState<"party1" | "party2" | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractionContext, setExtractionContext] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open && documentId) {
      extractBothParties();
    }
  }, [open, documentId]);

  const extractBothParties = async () => {
    setIsExtracting(true);
    try {
      const response = await fetch(`/api/document/${documentId}/extract-parties`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to extract party information');
      }

      const result: PartyExtractionResult = await response.json();
      setParty1Name(result.party1Name);
      setParty2Name(result.party2Name);
      setExtractionContext(result.context);
    } catch (error) {
      console.error('Error extracting parties:', error);
      toast({
        title: "Extraction Failed",
        description: "Could not automatically detect the contract parties. You can still proceed.",
        variant: "default"
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async () => {
    if (!partyType) {
      toast({
        title: "Selection Required",
        description: "Please select whether you're the drafting party or adverse party",
        variant: "destructive"
      });
      return;
    }

    if (!selectedParty && (party1Name || party2Name)) {
      toast({
        title: "Selection Required",
        description: "Please select which party you represent",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest('POST', `/api/document/${documentId}/party-info`, {
        userPartyType: partyType,
        party1Name: party1Name || undefined,
        party2Name: party2Name || undefined,
        userSelectedParty: selectedParty || undefined,
      });

      toast({
        title: "Party Information Saved",
        description: "Your analysis will be personalized based on your role",
      });

      onComplete();
    } catch (error) {
      console.error('Error saving party info:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save party information",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUserSelectedPartyName = () => {
    if (selectedParty === "party1") return party1Name;
    if (selectedParty === "party2") return party2Name;
    return null;
  };

  const getOtherPartyName = () => {
    if (selectedParty === "party1") return party2Name;
    if (selectedParty === "party2") return party1Name;
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" data-testid="dialog-party-identification">
        <DialogHeader>
          <DialogTitle className="text-xl">Identify Your Role</DialogTitle>
          <DialogDescription className="text-sm">
            Help us personalize your contract analysis by telling us who you are in this agreement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {isExtracting ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-slate-600">Detecting parties...</span>
            </div>
          ) : (
            <>
              {/* Step 1: Which party are you? */}
              {(party1Name || party2Name) && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold text-slate-900">
                      1. Which party do you represent?
                    </Label>
                    {extractionContext && (
                      <p className="text-xs text-slate-500 mt-1">{extractionContext}</p>
                    )}
                  </div>
                  
                  <RadioGroup value={selectedParty || ""} onValueChange={(value) => setSelectedParty(value as "party1" | "party2")} data-testid="radio-selected-party">
                    {party1Name && (
                      <div className="flex items-center space-x-2 border border-slate-200 rounded-lg p-3 hover:bg-slate-50 cursor-pointer">
                        <RadioGroupItem value="party1" id="party1" data-testid="radio-party1" />
                        <Label htmlFor="party1" className="flex-1 cursor-pointer text-sm">
                          <span className="font-medium text-slate-900">{party1Name}</span>
                          <span className="text-xs text-slate-500 block mt-0.5">First party</span>
                        </Label>
                      </div>
                    )}
                    
                    {party2Name && (
                      <div className="flex items-center space-x-2 border border-slate-200 rounded-lg p-3 hover:bg-slate-50 cursor-pointer">
                        <RadioGroupItem value="party2" id="party2" data-testid="radio-party2" />
                        <Label htmlFor="party2" className="flex-1 cursor-pointer text-sm">
                          <span className="font-medium text-slate-900">{party2Name}</span>
                          <span className="text-xs text-slate-500 block mt-0.5">Second party</span>
                        </Label>
                      </div>
                    )}
                  </RadioGroup>
                </div>
              )}

              {/* Step 2: Drafting or adverse party? */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-semibold text-slate-900">
                    2. Your role in this contract?
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Helps us tailor recommendations
                  </p>
                </div>
                
                <RadioGroup value={partyType || ""} onValueChange={(value) => setPartyType(value as "drafting" | "adverse")} data-testid="radio-party-type">
                  <div className="flex items-center space-x-2 border border-slate-200 rounded-lg p-3 hover:bg-slate-50 cursor-pointer">
                    <RadioGroupItem value="drafting" id="drafting" data-testid="radio-drafting" />
                    <Label htmlFor="drafting" className="flex-1 cursor-pointer">
                      <span className="font-medium text-slate-900 block text-sm">Drafting Party</span>
                      <span className="text-xs text-slate-600">You wrote this contract</span>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 border border-slate-200 rounded-lg p-3 hover:bg-slate-50 cursor-pointer">
                    <RadioGroupItem value="adverse" id="adverse" data-testid="radio-adverse" />
                    <Label htmlFor="adverse" className="flex-1 cursor-pointer">
                      <span className="font-medium text-slate-900 block text-sm">Adverse Party</span>
                      <span className="text-xs text-slate-600">Reviewing other party's contract</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Summary */}
              {selectedParty && partyType && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-900">
                    <strong>Summary:</strong> You are <strong>{getUserSelectedPartyName()}</strong> (the {partyType} party) 
                    {getOtherPartyName() && <> negotiating with <strong>{getOtherPartyName()}</strong></>}.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            data-testid="button-cancel"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isExtracting}
            data-testid="button-continue"
            size="sm"
          >
            {isSubmitting ? "Saving..." : "Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
