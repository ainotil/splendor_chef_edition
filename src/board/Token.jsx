import { TOKEN_INFO } from './labels.js';

// 一个圆形代币：显示名字和数量
export function Token({ type, count, onClick, selected, small }) {
  const info = TOKEN_INFO[type];
  return (
    <button
      className={`token ${selected ? 'selected' : ''} ${small ? 'small' : ''}`}
      style={{ background: info.color, color: info.text }}
      onClick={onClick}
      disabled={!onClick}
      title={info.name}
    >
      <span className="token-name">{info.name}</span>
      {count !== undefined && <span className="token-count">{count}</span>}
    </button>
  );
}
