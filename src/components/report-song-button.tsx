'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert } from 'lucide-react';

interface ReportSongButtonProps {
  hasReportedThisSong: boolean;
  postReport: (reason: string) => Promise<{ success: boolean; error?: string }>;
  retractReport: () => Promise<{ success: boolean; error?: string }>;
}

const reportReasons = [
  { id: 'low_quality', label: 'Low audio quality' },
  { id: 'offensive_lyrics', label: 'Offensive lyrics or content' },
  { id: 'incorrect_metadata', label: 'Incorrect song title or artist' },
  { id: 'other', label: 'Other' },
];

export default function ReportSongButton({
  hasReportedThisSong,
  postReport,
  retractReport,
}: ReportSongButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isRetracting, setIsRetracting] = React.useState(false);
  const [selectedReason, setSelectedReason] = React.useState<string | null>(
    null
  );
  const [otherReasonText, setOtherReasonText] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  const handleRetract = async () => {
    setIsRetracting(true);
    try {
      const result = await retractReport();
      if (!result.success) throw new Error(result.error);
      toast({
        title: 'Report Retracted',
        description: 'You can now interact with this song again.',
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Could not retract report',
        description: errorMessage,
      });
    } finally {
      setIsRetracting(false);
      setIsDialogOpen(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast({
        variant: 'destructive',
        title: 'No reason selected',
        description: 'Please select a reason for reporting this song.',
      });
      return;
    }

    const reasonPayload =
      selectedReason === 'other'
        ? `other: ${otherReasonText.trim()}`
        : selectedReason;

    setIsSubmitting(true);
    try {
      const result = await postReport(reasonPayload);
      if (result.success) {
        toast({
          title: 'Report Submitted',
          description:
            'Thank you for your feedback. You will no longer be able to interact with this song.',
        });
        setIsDialogOpen(false);
        setSelectedReason(null);
        setOtherReasonText('');
      } else {
        throw new Error(result.error);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Could not submit report',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasReportedThisSong) {
    return (
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size="icon"
            className="h-6 w-6"
            disabled={isRetracting}
            title="You have reported this song. Click to retract."
            aria-label="Retract song report"
          >
            {isRetracting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldAlert className="h-4 w-4" />
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retract Report?</AlertDialogTitle>
            <AlertDialogDescription>
              If you retract this report, you will be able to interact with this
              song again. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRetract}>
              Retract Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          title="Report this song"
          aria-label="Report this song"
        >
          <ShieldAlert className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Report Song</AlertDialogTitle>
          <AlertDialogDescription>
            Help us improve the radio by letting us know what&apos;s wrong with
            this song. Reporting will remove your reactions and comments for
            this track.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <RadioGroup
          value={selectedReason ?? undefined}
          onValueChange={(value) => {
            setSelectedReason(value);
            if (value !== 'other') setOtherReasonText('');
          }}
          className="my-4 space-y-2"
        >
          {reportReasons.map((reason) => (
            <div key={reason.id} className="flex items-center space-x-2">
              <RadioGroupItem value={reason.id} id={`report-${reason.id}`} />
              <Label htmlFor={`report-${reason.id}`}>{reason.label}</Label>
            </div>
          ))}
        </RadioGroup>
        {selectedReason === 'other' && (
          <Textarea
            value={otherReasonText}
            onChange={(e) => setOtherReasonText(e.target.value)}
            placeholder="Please specify the reason for your report (max 100 characters)."
            className="mt-2"
            maxLength={100}
            aria-label="Specify other reason for report"
            autoFocus
          />
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={
              !selectedReason ||
              (selectedReason === 'other' && !otherReasonText.trim()) ||
              isSubmitting
            }
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Report
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
