import { W, H, GRAVITY } from './config.js?v=1792033814';
import { DPR } from './hidpi.js?v=1792033814';
import BootScene from './scenes/BootScene.js?v=1792033814';
import TitleScene from './scenes/TitleScene.js?v=1792033814';
import StageScene from './scenes/StageScene.js?v=1792033814';
import SelectScene from './scenes/SelectScene.js?v=1792033814';
import ShopScene from './scenes/ShopScene.js?v=1792033814';
import PlayScene from './scenes/PlayScene.js?v=1792033814';
import ResultScene from './scenes/ResultScene.js?v=1792033814';

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
