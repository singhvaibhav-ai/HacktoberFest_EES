const MODIFIERS = {
  easy: 'difficulty-easy',
  medium: 'difficulty-medium',
  hard: 'difficulty-hard',
};

export default function DifficultyBadge({ difficulty }) {
  if (!difficulty) return null;
  const modifier = MODIFIERS[difficulty.toLowerCase()] || '';
  return <span className={`difficulty ${modifier}`.trim()}>{difficulty}</span>;
}
