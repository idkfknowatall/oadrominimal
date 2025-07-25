import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VoteButton } from '../vote-button';

describe('VoteButton', () => {
  const defaultProps = {
    type: 'like' as const,
    count: 5,
    isActive: false,
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders like button with correct icon and count', () => {
      render(<VoteButton {...defaultProps} />);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByLabelText('Like this song (5 likes)')).toBeInTheDocument();
    });

    it('renders dislike button with correct icon and count', () => {
      render(<VoteButton {...defaultProps} type="dislike" />);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByLabelText('Dislike this song (5 dislikes)')).toBeInTheDocument();
    });

    it('renders without count when showCount is false', () => {
      render(<VoteButton {...defaultProps} showCount={false} />);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.queryByText('5')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Like this song')).toBeInTheDocument();
    });
  });

  describe('Active State', () => {
    it('applies active styles when isActive is true', () => {
      render(<VoteButton {...defaultProps} isActive={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(button).toHaveClass('bg-green-500');
    });

    it('applies active styles for dislike button', () => {
      render(<VoteButton {...defaultProps} type="dislike" isActive={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(button).toHaveClass('bg-red-500');
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when isLoading is true', () => {
      render(<VoteButton {...defaultProps} isLoading={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      
      // Check for loading spinner
      const spinner = button.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('applies pulse animation to icon when loading', () => {
      render(<VoteButton {...defaultProps} isLoading={true} />);
      
      const icon = screen.getByRole('button').querySelector('svg');
      expect(icon).toHaveClass('animate-pulse');
    });
  });

  describe('Disabled State', () => {
    it('disables button when disabled prop is true', () => {
      render(<VoteButton {...defaultProps} disabled={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
    });

    it('disables button when isLoading is true', () => {
      render(<VoteButton {...defaultProps} isLoading={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Interactions', () => {
    it('calls onClick when clicked', () => {
      const onClick = jest.fn();
      render(<VoteButton {...defaultProps} onClick={onClick} />);
      
      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', () => {
      const onClick = jest.fn();
      render(<VoteButton {...defaultProps} onClick={onClick} disabled={true} />);
      
      fireEvent.click(screen.getByRole('button'));
      expect(onClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when loading', () => {
      const onClick = jest.fn();
      render(<VoteButton {...defaultProps} onClick={onClick} isLoading={true} />);
      
      fireEvent.click(screen.getByRole('button'));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<VoteButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Like this song (5 likes)');
      expect(button).toHaveAttribute('aria-pressed', 'false');
      expect(button).toHaveAttribute('role', 'button');
    });

    it('updates aria-pressed when active state changes', () => {
      const { rerender } = render(<VoteButton {...defaultProps} isActive={false} />);
      
      let button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'false');
      
      rerender(<VoteButton {...defaultProps} isActive={true} />);
      button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('supports keyboard navigation', () => {
      render(<VoteButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      
      // Verify button is focusable
      button.focus();
      expect(button).toHaveFocus();
      
      // Verify button has proper attributes for keyboard navigation
      expect(button).toHaveAttribute('type', 'button');
      expect(button).not.toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Styling and Animations', () => {
    it('applies correct base styles', () => {
      render(<VoteButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'group',
        'relative',
        'inline-flex',
        'items-center',
        'justify-center',
        'gap-2',
        'rounded-lg',
        'px-4',
        'py-2.5',
        'text-sm',
        'font-medium',
        'transition-all',
        'duration-200'
      );
    });

    it('applies like button color scheme', () => {
      render(<VoteButton {...defaultProps} type="like" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'border-green-200',
        'bg-green-50',
        'text-green-700'
      );
    });

    it('applies dislike button color scheme', () => {
      render(<VoteButton {...defaultProps} type="dislike" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'border-red-200',
        'bg-red-50',
        'text-red-700'
      );
    });

    it('applies hover and active transform classes', () => {
      render(<VoteButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'hover:scale-105',
        'active:scale-95',
        'transform-gpu',
        'will-change-transform'
      );
    });
  });

  describe('Count Animation', () => {
    it('re-renders count with animation key when count changes', () => {
      const { rerender } = render(<VoteButton {...defaultProps} count={5} />);
      
      let countElement = screen.getByText('5');
      expect(countElement).toHaveClass('animate-in', 'fade-in-0', 'zoom-in-95');
      
      rerender(<VoteButton {...defaultProps} count={6} />);
      countElement = screen.getByText('6');
      expect(countElement).toHaveClass('animate-in', 'fade-in-0', 'zoom-in-95');
    });
  });

  describe('Custom Props', () => {
    it('forwards additional props to button element', () => {
      render(<VoteButton {...defaultProps} data-testid="custom-vote-button" />);
      
      const button = screen.getByTestId('custom-vote-button');
      expect(button).toBeInTheDocument();
    });

    it('merges custom className with default classes', () => {
      render(<VoteButton {...defaultProps} className="custom-class" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
      expect(button).toHaveClass('group'); // Still has default classes
    });
  });
});