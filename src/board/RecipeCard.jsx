import { COLORS } from '../game/constants.js';
import { TOKEN_INFO } from './labels.js';

// 一张食谱卡：口碑、折扣颜色、菜名、价格
export function RecipeCard({ card, children, dim }) {
  if (!card) return <div className="card empty">空位</div>;
  const bonus = TOKEN_INFO[card.bonus];
  return (
    <div className={`card tier-${card.tier} ${dim ? 'dim' : ''}`}>
      <div className="card-top" style={{ background: bonus.color, color: bonus.text }}>
        <span className="card-points">{card.points || ''}</span>
        <span className="card-bonus">{bonus.name}</span>
      </div>
      <div className="card-name">{card.name}</div>
      <div className="card-cost">
        {COLORS.filter(c => card.cost[c]).map(c => (
          <span key={c} className="cost-pip" style={{ background: TOKEN_INFO[c].color, color: TOKEN_INFO[c].text }}>
            {card.cost[c]}
          </span>
        ))}
      </div>
      {children && <div className="card-actions">{children}</div>}
    </div>
  );
}
