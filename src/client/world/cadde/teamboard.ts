import * as THREE from 'three';
import { box } from '../station/kit';
import { mesh, toon } from '../toon';

// The live boards on the suite's back walls (see features/teamboards/): each is a canvas on a screen in a
// dark frame, which that feature redraws as the workers' work changes. The street only puts them up and
// keeps them in `teamBoards` for it.

/** What a board shows: one team's workers (`team`, an index into the template's offices), every team at a glance (`lead`), who's waiting on you (`asst`), or everyone (`you`). */
export type BoardKind = 'team' | 'lead' | 'asst' | 'you';

export interface TeamBoard {
  kind: BoardKind;
  /** The office of the army it shows (`team` boards), or -1. */
  team: number;
  /** The room's own name, for its header. */
  title: string;
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
}

/** The boards the street has up now, in the order they were made; `generation` goes up when it's rebuilt. */
export const teamBoards: TeamBoard[] = [];
export const boardGeneration = { n: 0 };

export function clearTeamBoards() {
  teamBoards.length = 0;
  boardGeneration.n++;
}

/** Puts a board `w` x `h` m, its middle at (u, y, v), on `parent`; it says it's waiting for the page until it's drawn on. */
export function addTeamBoard(parent: THREE.Object3D, kind: BoardKind, team: number, title: string, u: number, y: number, v: number, w: number, h: number): TeamBoard {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = Math.round((1024 * h) / w);
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#10161e';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = '#8fa3b8';
  g.font = '600 44px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText(`${title}: pano açılıyor…`, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  parent.add(mesh(box(w + 0.16, h + 0.16, 0.06), toon('#1d232b'), u, y, v - 0.03, false));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  screen.position.set(u, y, v + 0.005);
  parent.add(screen);
  const board: TeamBoard = { kind, team, title, canvas, texture };
  teamBoards.push(board);
  return board;
}
