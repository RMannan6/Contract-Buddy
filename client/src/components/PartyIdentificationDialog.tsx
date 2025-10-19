import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  draftingPartyName: string | null;
  confidence: string;
  context: string;
}

export function PartyIdentificationDialog({ open, onOpenChange, documentId, onComplete }: PartyIdentificationDialogProps) {
  const [partyType, setPartyType] = useState<"drafting" | "adverse" | null>(null);
  const [userEntityName, setUserEntityName] = useState("");
  const [draftingPartyName, setDraftingPartyName] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractionContext, setExtractionContext] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open && documentId) {
      extractDraftingParty();
    }
  }, [open, documentId]);

  const extractDraftingParty = async () => {
    setIsExtracting(true);
    try {
      const response = await fetch(`/api/document/${documentId}/extract-party`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to extract party information');
      }

      const result: PartyExtractionResult = await response.json();
      setDraftingPartyName(result.draftingPartyName);
      setExtractionContext(result.context);
    } catch (error) {
      console.error('Error extracting party:', error);
      toast({
        title: "Extraction Failed",
        description: "Could not automatically detect the drafting party. You can still proceed.",
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

    setIsSubmitting(true);
    try {
      await apiRequest('POST', `/api/document/${documentId}/party-info`, {
        userPartyType: partyType,
        draftingPartyName,
        userEntityName: userEntityName || undefined,
      });

      toast({
        title: "Party Information Saved",
        description: "Your analysis will be personalized based on your role",
      });

      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving party info:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save party information",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-party-identification">
        <DialogHeader>
          <DialogTitle>Identify Your Role</DialogTitle>
          <DialogDescription>
            Help us personalize the analysis by telling us your role in this contract.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isExtracting ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-sm text-slate-600">Analyzing contract...</span>
            </div>
          ) : draftingPartyName ? (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900">Detected Drafting Party:</p>
              <p className="text-base font-semibold text-blue-700 mt-1">{draftingPartyName}</p>
              {extractionContext && (
                <p className="text-xs text-blue-600 mt-2">{extractionContext}</p>
              )}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-600">Could not automatically detect the drafting party</p>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-base font-medium">
              Are you the drafting party or the adverse party?
            </Label>
            <RadioGroup value={partyType || ""} onValueChange={(value) => setPartyType(value as "drafting" | "adverse")}>
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                <RadioGroupItem value="drafting" id="drafting" data-testid="radio-drafting" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="drafting" className="font-medium cursor-pointer">
                    Drafting Party
                  </Label>
                  <p className="text-sm text-slate-600 mt-1">
                    I wrote or provided this contract. Recommendations will focus on fairness and clarity.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                <RadioGroupItem value="adverse" id="adverse" data-testid="radio-adverse" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="adverse" className="font-medium cursor-pointer">
                    Adverse Party
                  </Label>
                  <p className="text-sm text-slate-600 mt-1">
                    I'm being asked to sign this contract. Recommendations will emphasize risk mitigation and negotiation tips.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {partyType === "drafting" && (
            <div className="space-y-2">
              <Label htmlFor="entity-name" className="text-sm font-medium">
                Your Entity/Company Name (Optional)
              </Label>
              <Input
                id="entity-name"
                data-testid="input-entity-name"
                placeholder="Enter your entity or company name"
                value={userEntityName}
                onChange={(e) => setUserEntityName(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                We'll verify if this matches the detected drafting party
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            data-testid="button-cancel"
          >
            Skip for Now
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!partyType || isSubmitting}
            data-testid="button-submit"
          >
            {isSubmitting ? "Saving..." : "Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
