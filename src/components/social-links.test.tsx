import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SocialLinks } from './social-links';

// Mock the tooltip
jest.mock('./ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-provider">{children}</div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
  TooltipTrigger: ({
    asChild,
    children,
  }: {
    asChild: boolean;
    children: React.ReactNode;
  }) => <div data-testid="tooltip-trigger">{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

// Mock the icons
jest.mock('./icons/socials', () => ({
  socialIcons: {
    twitter: () => <div data-testid="twitter-icon" />,
    instagram: () => <div data-testid="instagram-icon" />,
    github: () => <div data-testid="github-icon" />,
    website: () => <div data-testid="website-icon" />,
  },
  socialPlatformNames: {
    twitter: 'Twitter',
    instagram: 'Instagram',
    github: 'GitHub',
    website: 'Website',
  },
}));

describe('SocialLinks Component', () => {
  it('renders nothing when socialLinks is null', () => {
    const { container } = render(<SocialLinks socialLinks={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when socialLinks is empty', () => {
    const { container } = render(<SocialLinks socialLinks={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when all socialLinks values are null', () => {
    const { container } = render(
      <SocialLinks
        socialLinks={{
          twitter: null,
          instagram: null,
        }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the correct social links', () => {
    const socialLinks = {
      twitter: 'https://twitter.com/example',
      instagram: 'https://instagram.com/example',
      github: null, // Should be filtered out
      website: 'https://example.com',
    };

    render(<SocialLinks socialLinks={socialLinks} />);

    // Should render the provider
    expect(screen.getByTestId('tooltip-provider')).toBeInTheDocument();

    // Should render the correct icons
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3); // Only 3 links should be rendered (github is null)

    // Twitter link should have the correct URL
    expect(links[0]).toHaveAttribute('href', 'https://twitter.com/example');
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer');

    // Instagram link should have the correct URL
    expect(links[1]).toHaveAttribute('href', 'https://instagram.com/example');

    // Website link should have the correct URL
    expect(links[2]).toHaveAttribute('href', 'https://example.com');
  });

  it('applies the correct variant class', () => {
    const socialLinks = {
      twitter: 'https://twitter.com/example',
    };

    // Default variant
    const { rerender } = render(
      <SocialLinks socialLinks={socialLinks} variant="default" />
    );
    expect(screen.getByRole('link')).toHaveClass('rounded-md');
    expect(screen.getByRole('link')).toHaveClass('bg-secondary');

    // Compact variant
    rerender(<SocialLinks socialLinks={socialLinks} variant="compact" />);
    expect(screen.getByRole('link')).toHaveClass('rounded-full');
    expect(screen.getByRole('link')).toHaveClass('bg-white/5');
  });
});
