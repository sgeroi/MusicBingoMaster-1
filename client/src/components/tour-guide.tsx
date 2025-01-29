import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TourStep {
  title: string;
  description: string;
  targetId: string;
}

interface TourGuideProps {
  steps: TourStep[];
  onComplete: () => void;
}

export function TourGuide({ steps, onComplete }: TourGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    // Highlight the current target element
    const targetElement = document.getElementById(steps[currentStep]?.targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
    }

    return () => {
      // Cleanup highlight
      if (targetElement) {
        targetElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
      }
    };
  }, [currentStep, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setOpen(false);
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!steps.length) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{steps[currentStep]?.title}</DialogTitle>
          <DialogDescription>
            {steps[currentStep]?.description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-between mt-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            Назад
          </Button>
          <Button onClick={handleNext}>
            {currentStep === steps.length - 1 ? 'Завершить' : 'Далее'}
          </Button>
        </div>
        <div className="text-center text-sm text-muted-foreground mt-2">
          {currentStep + 1} из {steps.length}
        </div>
      </DialogContent>
    </Dialog>
  );
}
