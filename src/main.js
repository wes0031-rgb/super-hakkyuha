import { W, H, GRAVITY } from './config.js';
import { DPR } from './hidpi.js';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import StageScene from './scenes/StageScene.js';
import SelectScene from './scenes/SelectScene.js';
import ShopScene from './scenes/ShopScene.js';
import PlayScene from './scenes/PlayScene.js';
import ResultScene from './scenes/ResultScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W * DPR,
  height: H * DPR,
  backgroundColor: '#2b2436',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: GRAVITY }, debug: false },
  },
  render: { antialias: true, roundPixels: false },
  scene: [BootScene, TitleScene, StageScene, SelectScene, ShopScene, PlayScene, ResultScene],
});
