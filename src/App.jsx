import { useState } from 'react';
import { Client } from 'boardgame.io/react';
import { ChefsTable } from './game/game.js';
import { Board } from './board/Board.jsx';
import { Help } from './board/Help.jsx';

// 每种人数一个同屏客户端，在模块加载时建好
const GAMES = {};
for (let n = ChefsTable.minPlayers; n <= ChefsTable.maxPlayers; n++) {
  GAMES[n] = Client({ game: ChefsTable, board: Board, numPlayers: n, debug: false });
}
const PLAYER_COUNTS = Object.keys(GAMES).map(Number);

// 开局：先选玩家数量，再开一局同屏游戏
export default function App() {
  const [numPlayers, setNumPlayers] = useState(null);
  const Game = GAMES[numPlayers];
  return (
    <>
      {Game ? <Game /> : <Lobby onStart={setNumPlayers} />}
      <Help />
    </>
  );
}

function Lobby({ onStart }) {
  const [n, setN] = useState(ChefsTable.maxPlayers);
  return (
    <div className="board">
      <section className="panel lobby">
        <h1>主厨餐桌</h1>
        <h2>玩家数量</h2>
        <div className="row">
          {PLAYER_COUNTS.map(count => (
            <button key={count} className={count === n ? 'primary' : ''} onClick={() => setN(count)}>
              {count} 人
            </button>
          ))}
        </div>
        {n < 5 && <p className="muted small">本改版按 5 人局设计，其他人数的数值尚未调校。</p>}
        <button className="primary" onClick={() => onStart(n)}>开始游戏</button>
      </section>
    </div>
  );
}
