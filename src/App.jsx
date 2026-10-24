import { Client } from 'boardgame.io/react';
import { ChefsTable } from './game/game.js';
import { Board } from './board/Board.jsx';

const App = Client({
  game: ChefsTable,
  board: Board,
  numPlayers: 5,
});

export default App;
