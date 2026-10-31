const TONES = { Easy: 'easy', Medium: 'medium', Hard: 'hard' };

export default function DifficultyBadge({ difficulty }) {
    const tone = TONES[difficulty] ?? 'neutral';
    return <span className={`diff - badge diff-${tone}`}> { difficulty }</span >;
}