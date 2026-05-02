const SUIT_ICON: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
const SUIT_COLOR: Record<string, string> = {
  s: 'text-slate-900',
  h: 'text-red-600',
  d: 'text-blue-600',
  c: 'text-emerald-700',
};
const SUIT_NAME: Record<string, string> = {
  s: 'espadas',
  h: 'copas',
  d: 'ouros',
  c: 'paus',
};

export function PlayingCard({ rank, suit }: { rank: string; suit: string }): React.ReactElement {
  const color = SUIT_COLOR[suit] ?? 'text-slate-900';
  const icon = SUIT_ICON[suit] ?? suit.toUpperCase();
  const suitName = SUIT_NAME[suit] ?? suit;

  return (
    <span
      className={`rounded-lg bg-white px-4 py-3 font-bold text-4xl flex flex-row items-center gap-1 leading-none ${color}`}
      aria-label={`${rank} de ${suitName}`}
    >
      <span>{rank}</span>
      <span aria-hidden="true">{icon}</span>
    </span>
  );
}
