// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

function LogoutSmokeButton() {
  return (
    <button onClick={() => window.api.auth.logout()} type="button">
      logout
    </button>
  );
}

describe('renderer test harness', () => {
  it('renders with jsdom and uses mocked window.api', async () => {
    const user = userEvent.setup();
    const logoutSpy = vi.spyOn(window.api.auth, 'logout').mockResolvedValue(undefined);

    render(<LogoutSmokeButton />);

    await user.click(screen.getByRole('button', { name: /logout/i }));

    expect(logoutSpy).toHaveBeenCalledTimes(1);
  });
});
