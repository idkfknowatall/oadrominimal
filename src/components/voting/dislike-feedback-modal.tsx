'use client';

import React, { useState } from 'react';
import { X, AlertCircle, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FEEDBACK_CATEGORIES, type FeedbackCategory } from '@/lib/voting-types';

interface DislikeFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  voteId: number | null;
  songId: string;
  onFeedbackSubmitted: () => void;
}

export function DislikeFeedbackModal({
  isOpen,
  onClose,
  voteId,
  songId,
  onFeedbackSubmitted,
}: DislikeFeedbackModalProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('other');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const maxChars = 1000;
  const minChars = 10;

  const handleReasonChange = (value: string) => {
    if (value.length <= maxChars) {
      setReason(value);
      setCharCount(value.length);
    }
  };

  const handleSubmit = async () => {
    if (!voteId) {
      toast({
        title: 'Error',
        description: 'Invalid vote ID',
        variant: 'destructive',
      });
      return;
    }

    if (reason.trim().length < minChars) {
      toast({
        title: 'Feedback Too Short',
        description: `Please provide at least ${minChars} characters of feedback.`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/votes/${voteId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: reason.trim(),
          category,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onFeedbackSubmitted();
        resetForm();
      } else {
        toast({
          title: 'Submission Failed',
          description: data.message || 'Failed to submit feedback',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      toast({
        title: 'Submission Failed',
        description: 'Network error. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setReason('');
    setCategory('other');
    setCharCount(0);
  };

  const isValid = reason.trim().length >= minChars && reason.trim().length <= maxChars;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Feedback on Disliked Song
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-sm text-muted-foreground">
            <p>
              Thank you for your feedback! This information helps our administrators 
              understand what content might need attention and improve the overall 
              listening experience.
            </p>
            <p className="mt-2 font-medium">
              Your feedback will be reviewed by administrators.
            </p>
          </div>

          {/* Category Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              What type of issue did you encounter?
            </Label>
            <RadioGroup
              value={category}
              onValueChange={(value: string) => setCategory(value as FeedbackCategory)}
              className="space-y-2"
            >
              {Object.entries(FEEDBACK_CATEGORIES).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={key}
                    id={key}
                    className="focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  />
                  <Label
                    htmlFor={key}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Reason Text Area */}
          <div className="space-y-2">
            <Label htmlFor="feedback-reason" className="text-sm font-medium">
              Please provide specific details about the issue
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Textarea
              id="feedback-reason"
              placeholder="Describe what you found problematic about this song..."
              value={reason}
              onChange={(e) => handleReasonChange(e.target.value)}
              className="min-h-[100px] resize-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              disabled={isSubmitting}
              aria-describedby="char-count feedback-help"
            />
            
            <div className="flex justify-between items-center text-xs">
              <span id="feedback-help" className="text-muted-foreground">
                Minimum {minChars} characters required
              </span>
              <span
                id="char-count"
                className={`font-medium ${
                  charCount < minChars
                    ? 'text-destructive'
                    : charCount > maxChars * 0.9
                    ? 'text-orange-500'
                    : 'text-muted-foreground'
                }`}
                aria-live="polite"
              >
                {charCount}/{maxChars}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              className="flex-1 focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <AnimatePresence mode="wait">
                {isSubmitting ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </motion.div>
                ) : (
                  <motion.div
                    key="submit"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Submit Feedback
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
            
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={isSubmitting}
              className="flex-1 focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Skip for Now
            </Button>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="font-medium mb-1">Privacy Notice:</p>
            <p>
              Your feedback is anonymous and will only be used to improve content quality. 
              No personal information beyond your Discord username will be shared with administrators.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}