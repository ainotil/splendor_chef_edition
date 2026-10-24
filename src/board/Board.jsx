import { useState } from 'react';
import { COLORS, SEAT_BONUS, FRIDGE_LIMIT, MAX_RESERVED } from '../game/constants.js';
import { bonuses, score, tokenCount, payment, eligibleChefs } from '../game/state.js';
import { TOKEN_INFO, SEAT_NAMES } from './labels.js';
import { Token } from './Token.jsx';
import { RecipeCard } from './RecipeCard.jsx';
import './board.css';

const ALL_TOKENS = [...COLORS, 'stock'];

export function Board({ G, ctx, moves, playerID }) {
  // 同屏模式没有固定的 playerID，"我"就是当前行动的玩家
  const me = playerID ?? ctx.currentPlayer;
  const seat = ctx.playOrder.indexOf(me);

  if (ctx.gameover) return <GameOver result={ctx.gameover} />;

  return (
    <div className="board">
      <Header G={G} ctx={ctx} me={me} />
      {ctx.phase === 'draft'
        ? <DraftPanel G={G} moves={moves} seat={seat} />
        : <PlayArea G={G} ctx={ctx} moves={moves} me={me} />}
      <Players G={G} ctx={ctx} />
    </div>
  );
}

// ---------- 顶部：现在轮到谁 ----------
function Header({ G, ctx, me }) {
  const seat = ctx.playOrder.indexOf(me);
  const stage = ctx.activePlayers?.[me];
  const what =
    ctx.phase === 'draft' ? '挑选家常菜' :
    stage === 'discard' ? `冰箱放不下了，请弃到 ${FRIDGE_LIMIT} 个` :
    stage === 'chooseChef' ? '有多位主厨想来，请选 1 位' :
    '选择一个行动';
  return (
    <header className="header">
      <h1>主厨餐桌</h1>
      <div className="turn">
        <strong>{SEAT_NAMES[seat]}</strong>：{what}
      </div>
      {G.endTriggered && <div className="final-round">最后一轮！</div>}
    </header>
  );
}

// ---------- 开局：挑家常菜 + 座位补偿 ----------
function DraftPanel({ G, moves, seat }) {
  const [index, setIndex] = useState(null);
  const [picked, setPicked] = useState([]);
  const need = SEAT_BONUS[seat] ?? 0;

  function confirm() {
    moves.pickStarter(index, picked);
    setIndex(null);
    setPicked([]);
  }

  return (
    <section className="panel">
      <h2>1. 选一张家常菜</h2>
      <div className="row">
        {G.starters.map((card, i) => (
          <div key={i} className={`pickable ${index === i ? 'picked' : ''}`}
               onClick={() => card && setIndex(i)}>
            <RecipeCard card={card} />
          </div>
        ))}
      </div>

      <h2>2. 领取开局调味：{need} 个（可重复）</h2>
      <div className="row">
        {COLORS.map(c => (
          <Token key={c} type={c}
                 onClick={picked.length < need ? () => setPicked([...picked, c]) : undefined} />
        ))}
      </div>
      <div className="row">
        已选：
        {picked.length === 0 && <span className="muted">无</span>}
        {picked.map((c, i) => (
          <Token key={i} type={c} small
                 onClick={() => setPicked(picked.filter((_, j) => j !== i))} />
        ))}
      </div>

      <button className="primary" disabled={index === null || picked.length !== need} onClick={confirm}>
        确定
      </button>
    </section>
  );
}

// ---------- 正式游戏 ----------
function PlayArea({ G, ctx, moves, me }) {
  const stage = ctx.activePlayers?.[me];
  const player = G.players[me];

  return (
    <div className="play">
      <div className="table">
        <Bank G={G} moves={moves} active={!stage} />
        <Chefs G={G} player={player} moves={moves} choosing={stage === 'chooseChef'} />
        <Market G={G} player={player} moves={moves} active={!stage} />
      </div>
      <MyPanel player={player} me={me} moves={moves} stage={stage} />
    </div>
  );
}

// 桌面调味：点选后拿
function Bank({ G, moves, active }) {
  const [selected, setSelected] = useState([]);

  function toggle(c) {
    setSelected(selected.includes(c) ? selected.filter(x => x !== c) : [...selected, c].slice(-3));
  }
  function takeThree() { moves.takeThree(selected); setSelected([]); }
  function takeTwo() { moves.takeTwo(selected[0]); setSelected([]); }

  return (
    <section className="panel">
      <h2>桌面调味</h2>
      <div className="row">
        {COLORS.map(c => (
          <Token key={c} type={c} count={G.bank[c]} selected={selected.includes(c)}
                 onClick={active && G.bank[c] > 0 ? () => toggle(c) : undefined} />
        ))}
        <Token type="stock" count={G.bank.stock} />
      </div>
      {active && (
        <div className="row">
          <button disabled={selected.length === 0} onClick={takeThree}>
            拿选中的（不同色，最多 3 个）
          </button>
          <button disabled={selected.length !== 1 || G.bank[selected[0]] < 4} onClick={takeTwo}>
            拿 2 个同色（剩余 ≥ 4）
          </button>
        </div>
      )}
    </section>
  );
}

// 主厨区
function Chefs({ G, player, moves, choosing }) {
  const eligible = eligibleChefs(G, player).map(c => c.id);
  return (
    <section className="panel">
      <h2>主厨</h2>
      <div className="row">
        {G.chefs.length === 0 && <span className="muted">已全部被请走</span>}
        {G.chefs.map(chef => (
          <div key={chef.id} className={`chef ${chef.side}`}>
            <div className="chef-name">{chef.name}</div>
            <div className="chef-points">{chef.points} 分</div>
            <div className="card-cost">
              {Object.entries(chef.requires).map(([c, n]) => (
                <span key={c} className="cost-pip" style={{ background: TOKEN_INFO[c].color, color: TOKEN_INFO[c].text }}>{n}</span>
              ))}
            </div>
            {choosing && eligible.includes(chef.id) && (
              <button className="primary" onClick={() => moves.chooseChef(chef.id)}>请他来</button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// 市场三行
function Market({ G, player, moves, active }) {
  const canReserve = active && player.reserved.length < MAX_RESERVED;
  return (
    <section className="panel">
      <h2>食谱市场</h2>
      {[3, 2, 1].map(tier => (
        <div key={tier} className="row market-row">
          <div className={`deck tier-${tier}`}>
            <div>{tier} 级</div>
            <div className="muted">剩 {G.decks[tier].length}</div>
            {canReserve && G.decks[tier].length > 0 && (
              <button onClick={() => moves.reserveFromDeck(tier)}>暗预订</button>
            )}
          </div>
          {G.market[tier].map((card, slot) => {
            const affordable = card && payment(player, card);
            return (
              <RecipeCard key={slot} card={card} dim={card && !affordable}>
                {active && card && (
                  <>
                    <button disabled={!affordable} onClick={() => moves.buy(tier, slot)}>买</button>
                    <button disabled={!canReserve} onClick={() => moves.reserve(tier, slot)}>预订</button>
                  </>
                )}
              </RecipeCard>
            );
          })}
        </div>
      ))}
    </section>
  );
}

// 当前玩家的详细面板
function MyPanel({ player, me, moves, stage }) {
  const b = bonuses(player);
  const discarding = stage === 'discard';
  return (
    <aside className="panel me">
      <h2>{SEAT_NAMES[Number(me)]} · {score(player)} 分</h2>

      <h3>手里的调味（{tokenCount(player)} / {FRIDGE_LIMIT}）</h3>
      {discarding && <p className="warn">点调味把它扔掉</p>}
      <div className="row">
        {ALL_TOKENS.map(t => (
          <Token key={t} type={t} count={player.tokens[t]}
                 onClick={discarding && player.tokens[t] > 0 ? () => moves.discard(t) : undefined} />
        ))}
      </div>

      <h3>折扣（已做的菜 {player.cards.length} 道）</h3>
      <div className="row">
        {COLORS.map(c => <Token key={c} type={c} count={b[c]} small />)}
      </div>

      <h3>预订（{player.reserved.length} / {MAX_RESERVED}）</h3>
      <div className="row">
        {player.reserved.length === 0 && <span className="muted">无</span>}
        {player.reserved.map((card, i) => {
          const affordable = payment(player, card);
          return (
            <RecipeCard key={card.id} card={card} dim={!affordable}>
              {!stage && <button disabled={!affordable} onClick={() => moves.buyReserved(i)}>买</button>}
            </RecipeCard>
          );
        })}
      </div>

      {player.chefs.length > 0 && (
        <>
          <h3>请来的主厨</h3>
          <div className="row">
            {player.chefs.map(c => <span key={c.id} className={`tag ${c.side}`}>{c.name}</span>)}
          </div>
        </>
      )}
    </aside>
  );
}

// ---------- 底部：所有玩家概况 ----------
function Players({ G, ctx }) {
  return (
    <section className="players">
      {ctx.playOrder.map((id, seat) => {
        const p = G.players[id];
        const b = bonuses(p);
        return (
          <div key={id} className={`player ${id === ctx.currentPlayer ? 'current' : ''}`}>
            <div className="player-head">
              <strong>{SEAT_NAMES[seat]}</strong>
              <span>{score(p)} 分</span>
            </div>
            <div className="mini">
              {ALL_TOKENS.map(t => (
                <span key={t} className="mini-token" style={{ background: TOKEN_INFO[t].color, color: TOKEN_INFO[t].text }}>
                  {p.tokens[t]}{t !== 'stock' && b[t] > 0 && <sup>+{b[t]}</sup>}
                </span>
              ))}
            </div>
            <div className="muted small">
              菜 {p.cards.length} · 预订 {p.reserved.length} · 主厨 {p.chefs.length}
            </div>
          </div>
        );
      })}
    </section>
  );
}

// ---------- 结算 ----------
function GameOver({ result }) {
  return (
    <div className="board">
      <section className="panel gameover">
        <h1>游戏结束</h1>
        <p>获胜：{result.winners.map(id => SEAT_NAMES[Number(id)]).join('、')}</p>
        <table>
          <thead><tr><th>名次</th><th>座位</th><th>口碑</th><th>菜</th><th>恶魔</th></tr></thead>
          <tbody>
            {result.ranking.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td><td>{SEAT_NAMES[Number(r.id)]}</td>
                <td>{r.score}</td><td>{r.cards}</td><td>{r.devils}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
