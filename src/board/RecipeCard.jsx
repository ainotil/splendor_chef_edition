import { COLORS } from '../game/constants.js';
import { TOKEN_INFO } from './labels.js';

// 一张食谱卡：左上口碑、右上折扣颜色、中间菜名、左下价格、右下按钮
export function RecipeCard({ card, children, dim, compact }) {
  if (!card) return <div className="card empty">空位</div>;
  const bonus = TOKEN_INFO[card.bonus];
  return (
    <div className={`card tier-${card.tier} ${dim ? 'dim' : ''} ${compact ? 'compact' : ''}`}
         style={{ '--bonus': bonus.color, '--bonus-text': bonus.text }}>
      <div className="card-top">
        <span className="card-points">{card.points || ''}</span>
        <span className="card-bonus" title={`做出来后永久少付 1 个${bonus.name}`}>{bonus.name}</span>
      </div>
      <div className="card-name">{card.name}</div>
      <div className="card-bottom">
        <div className="card-cost">
          {COLORS.filter(c => card.cost[c]).map(c => (
            <span key={c} className="cost-pip" title={`${TOKEN_INFO[c].name} ×${card.cost[c]}`}
                  style={{ background: TOKEN_INFO[c].color, color: TOKEN_INFO[c].text }}>
              {card.cost[c]}
            </span>
          ))}
        </div>
        {children && <div className="card-actions">{children}</div>}
      </div>
    </div>
  );
}
