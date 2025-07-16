'use client';

import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2 } from 'lucide-react';
import {
  socialIcons,
  socialPlatformNames,
  SocialPlatform,
} from './icons/socials';
import type { SocialLinksData } from './social-links';

interface SocialLinksFormProps {
  initialLinks?: SocialLinksData;
  onSave: (links: SocialLinksData) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

export function SocialLinksForm({
  initialLinks = {},
  onSave,
  onCancel,
  className,
}: SocialLinksFormProps) {
  const [links, setLinks] = useState<SocialLinksData>(initialLinks);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await onSave(links);
      toast({
        title: 'Success',
        description: 'Your social links have been updated.',
      });
    } catch (error) {
      console.error('Error saving social links:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update social links. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // This function is not used, but it is kept for future reference
  // in case we want to filter out empty values before submission.
  // const getCleanLinks = () => {
  //   return Object.fromEntries(
  //     Object.entries(links).filter(([, value]) => value !== '' && value !== null)
  //   );
  // };

  const handleChange = (platform: string, value: string) => {
    setLinks((prev) => ({
      ...prev,
      [platform]: value || null,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-4">
        {(Object.keys(socialIcons) as SocialPlatform[]).map((platform) => {
          const Icon = socialIcons[platform];
          const platformName = socialPlatformNames[platform];

          return (
            <div key={platform} className="space-y-2">
              <Label
                htmlFor={`social-${platform}`}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                <span>{platformName}</span>
              </Label>
              <Input
                id={`social-${platform}`}
                placeholder={`${platformName} URL`}
                value={links[platform] || ''}
                onChange={(e) => handleChange(platform, e.target.value)}
                type="url"
                className="w-full"
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-2 mt-6">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
