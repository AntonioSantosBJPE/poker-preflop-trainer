// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function BombsOnRender({ shouldThrow }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error('explodiu');
  return <p>ok</p>;
}

describe('ErrorBoundary', () => {
  it('renderiza children quando não há erro', () => {
    render(
      <ErrorBoundary>
        <p data-testid="child">funcionando</p>
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('funcionando');
  });

  it('mostra fallback quando child lança erro', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <BombsOnRender shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
  });
});
