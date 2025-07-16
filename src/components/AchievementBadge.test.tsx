import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AchievementBadge from './AchievementBadge';
import type { Achievement } from '@/lib/types';

describe('AchievementBadge', () => {
  const mockAchievement: Achievement = {
    id: 'react_10',
    name: 'Regular Reactor',
    description: 'Reacted 10 times.',
    iconName: 'ThumbsUp',
    type: 'user',
    category: 'reactions',
    tier: 2,
    threshold: 10,
  };

  it('renders the achievement name and icon', () => {
    render(<AchievementBadge achievement={mockAchievement} />);

    expect(screen.getByText('Regular Reactor')).toBeInTheDocument();

    const badgeElement = screen.getByText('Regular Reactor').closest('div');
    expect(badgeElement).toBeInTheDocument();
    expect(badgeElement?.querySelector('svg')).toBeInTheDocument();
  });

  it('displays the tooltip description on hover', async () => {
    const user = userEvent.setup();
    render(<AchievementBadge achievement={mockAchievement} />);

    const badgeTrigger = screen.getByText('Regular Reactor');
    await user.hover(badgeTrigger);

    // Find the tooltip by its role, which is more specific and accessible.
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('Reacted 10 times.');
  });

  it('applies the correct category style', () => {
    render(<AchievementBadge achievement={mockAchievement} />);

    const badgeElement = screen.getByText('Regular Reactor').closest('div');
    expect(badgeElement).toHaveClass('border-violet-500/30');
    expect(badgeElement).toHaveClass('bg-violet-900/20');
  });

  it('returns null if the icon name is not found', () => {
    const achievementWithInvalidIcon: Achievement = {
      ...mockAchievement,
      iconName: 'InvalidIconName',
    };
    const { container } = render(
      <AchievementBadge achievement={achievementWithInvalidIcon} />
    );
    expect(container.firstChild).toBeNull();
  });
});
