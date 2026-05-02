// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlayingCard } from '@/components/PlayingCard';

describe('PlayingCard', () => {
  it('renders rank and spades ♠', () => {
    render(<PlayingCard rank="A" suit="s" />);

    expect(screen.getByLabelText('A de espadas')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('♠')).toBeInTheDocument();
  });

  it('renders hearts ♥', () => {
    render(<PlayingCard rank="K" suit="h" />);
    expect(screen.getByLabelText('K de copas')).toBeInTheDocument();
    expect(screen.getByText('K')).toBeInTheDocument();
    expect(screen.getByText('♥')).toBeInTheDocument();
  });

  it('renders diamonds ♦', () => {
    render(<PlayingCard rank="10" suit="d" />);
    expect(screen.getByLabelText('10 de ouros')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('♦')).toBeInTheDocument();
  });

  it('renders clubs ♣', () => {
    render(<PlayingCard rank="2" suit="c" />);
    expect(screen.getByLabelText('2 de paus')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('♣')).toBeInTheDocument();
  });

  it('uses fallbacks for an unknown suit code', () => {
    render(<PlayingCard rank="J" suit="z" />);
    expect(screen.getByLabelText('J de z')).toBeInTheDocument();
    expect(screen.getByText('J')).toBeInTheDocument();
    expect(screen.getByText('Z')).toBeInTheDocument();
  });
});
