import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SocialLinksForm } from './social-links-form';
import { act } from 'react-dom/test-utils';

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
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

describe('SocialLinksForm Component', () => {
  it('renders the form with all social platforms', () => {
    render(<SocialLinksForm onSave={jest.fn()} />);

    // Should have labels for all platforms
    expect(screen.getByText('Twitter')).toBeInTheDocument();
    expect(screen.getByText('Instagram')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('Website')).toBeInTheDocument();

    // Should have inputs for all platforms
    expect(screen.getByPlaceholderText('Twitter URL')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Instagram URL')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('GitHub URL')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Website URL')).toBeInTheDocument();

    // Should have a save button
    expect(
      screen.getByRole('button', { name: /save changes/i })
    ).toBeInTheDocument();
  });

  it('renders with initial links', () => {
    const initialLinks = {
      twitter: 'https://twitter.com/example',
      instagram: 'https://instagram.com/example',
    };

    render(<SocialLinksForm initialLinks={initialLinks} onSave={jest.fn()} />);

    // Inputs should have initial values
    expect(screen.getByPlaceholderText('Twitter URL')).toHaveValue(
      'https://twitter.com/example'
    );
    expect(screen.getByPlaceholderText('Instagram URL')).toHaveValue(
      'https://instagram.com/example'
    );

    // Other inputs should be empty
    expect(screen.getByPlaceholderText('GitHub URL')).toHaveValue('');
    expect(screen.getByPlaceholderText('Website URL')).toHaveValue('');
  });

  it('handles input changes', () => {
    render(<SocialLinksForm onSave={jest.fn()} />);

    // Change the Twitter input
    const twitterInput = screen.getByPlaceholderText('Twitter URL');
    fireEvent.change(twitterInput, {
      target: { value: 'https://twitter.com/newuser' },
    });
    expect(twitterInput).toHaveValue('https://twitter.com/newuser');

    // Change the Instagram input
    const instagramInput = screen.getByPlaceholderText('Instagram URL');
    fireEvent.change(instagramInput, {
      target: { value: 'https://instagram.com/newuser' },
    });
    expect(instagramInput).toHaveValue('https://instagram.com/newuser');
  });

  it('calls onSave with the updated links when submitted', async () => {
    const onSaveMock = jest.fn().mockResolvedValue(undefined);

    render(<SocialLinksForm onSave={onSaveMock} />);

    // Fill in some inputs
    fireEvent.change(screen.getByPlaceholderText('Twitter URL'), {
      target: { value: 'https://twitter.com/example' },
    });
    fireEvent.change(screen.getByPlaceholderText('GitHub URL'), {
      target: { value: 'https://github.com/example' },
    });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(onSaveMock).toHaveBeenCalledWith({
        twitter: 'https://twitter.com/example',
        github: 'https://github.com/example',
      });
    });
  });

  it('shows a cancel button when onCancel is provided', () => {
    const onCancelMock = jest.fn();
    render(<SocialLinksForm onSave={jest.fn()} onCancel={onCancelMock} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();

    // Click the cancel button
    fireEvent.click(cancelButton);
    expect(onCancelMock).toHaveBeenCalled();
  });

  it('disables the buttons during saving', async () => {
    // Create a mock that doesn't resolve immediately
    const onSaveMock = jest.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve(undefined), 100);
      });
    });

    render(<SocialLinksForm onSave={onSaveMock} onCancel={jest.fn()} />);

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    // Buttons should be disabled during saving
    expect(
      screen.getByRole('button', { name: /save changes/i })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

    // Wait for the save to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    // Buttons should be enabled again
    expect(
      screen.getByRole('button', { name: /save changes/i })
    ).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).not.toBeDisabled();
  });
});
