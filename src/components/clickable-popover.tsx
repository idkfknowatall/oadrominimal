'use client';

import * as React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type {
  PopoverContentProps,
  PopoverProps,
} from '@radix-ui/react-popover';

interface ClickablePopoverProps extends PopoverProps {
  children: React.ReactNode;
  content: React.ReactNode;
  contentProps?: PopoverContentProps;
}

export function ClickablePopover({
  children,
  content,
  contentProps,
}: ClickablePopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const openTimeoutRef = React.useRef<NodeJS.Timeout>();
  const closeTimeoutRef = React.useRef<NodeJS.Timeout>();

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  const onMouseEnter = () => {
    clearTimeout(closeTimeoutRef.current);
    openTimeoutRef.current = setTimeout(() => handleOpenChange(true), 150);
  };

  const onMouseLeave = () => {
    clearTimeout(openTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => handleOpenChange(false), 200);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        asChild
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        {...contentProps}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}
