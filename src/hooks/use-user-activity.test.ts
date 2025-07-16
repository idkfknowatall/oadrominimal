import { renderHook, act } from '@testing-library/react';
import { useUserActivity } from './use-user-activity';
import fetchMock from 'jest-fetch-mock';

describe('useUserActivity', () => {
  beforeEach(() => {
    fetchMock.enableMocks();
    fetchMock.resetMocks();
  });

  it('should fetch user activity without an Authorization header', async () => {
    const userId = 'test-user';
    fetchMock.mockResponseOnce(JSON.stringify({ comments: [], reactions: [] }));
    renderHook(() => useUserActivity(userId));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost/api/user/interactions?userId=${userId}&limit=10`
    );
  });
});
