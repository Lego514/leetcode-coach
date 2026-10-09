import { describe, expect, it } from 'vitest';
import { boardDocSchema } from '../../../shared/protocol';
import { boardToSvg, estimateWidth } from './exportSvg';
import {
  addElement,
  addGraphEdge,
  addGraphNode,
  addPointerAt,
  createElement,
  deleteGraphNode,
  edgeShape,
  EMPTY_DOC,
  findElement,
  graphLayout,
  POINTER_H,
  POINTER_W,
  pointerPosition,
  pointsDown,
  removeGraphEdge,
  setDirected,
  setGraphColor,
  shiftPointer,
  snapTarget,
  TREE_D,
  updateGraphEdge,
  type BoardDoc,
  type ElementOf,
} from './model';
import { applyStructureText, parseGraph, serializeGraph } from './structures';

const texts = { heading: 'Title', text: 'Text', sticky: 'Idea' };

function graphDoc(patch: Partial<ElementOf<'graph'>> = {}): BoardDoc {
  return addElement(EMPTY_DOC, { ...createElement('graph', { x: 0, y: 0 }, 'g', texts), ...patch } as ElementOf<'graph'>);
}

const graph = (doc: BoardDoc) => findElement(doc, 'g') as ElementOf<'graph'>;

describe('graph layout', () => {
  it('spreads nodes evenly on a circle, starting at the top', () => {
    const { centers, w, h } = graphLayout(graph(graphDoc()));
    expect(centers).toHaveLength(4);
    // 第 0 個在正上方，第 2 個在正下方，左右對稱
    expect(centers[0].x).toBe(w / 2);
    expect(centers[2].x).toBe(w / 2);
    expect(centers[2].y).toBeGreaterThan(centers[0].y);
    expect(centers[1].x - w / 2).toBe(w / 2 - centers[3].x);
    expect(h).toBeGreaterThan(w);
  });

  it('curves opposite directed edges apart and loops self-edges above the node', () => {
    const g = graph(graphDoc({ directed: true, edges: [{ a: 0, b: 1 }, { a: 1, b: 0 }, { a: 2, b: 2 }] }));
    const { centers } = graphLayout(g);
    const there = edgeShape(g, centers, g.edges[0])!;
    const back = edgeShape(g, centers, g.edges[1])!;
    expect(there.path).toContain('Q');
    expect(there.label).not.toEqual(back.label);
    expect(edgeShape(g, centers, g.edges[2])!.label.y).toBeLessThan(centers[2].y - TREE_D / 2);
    // 無向圖就是直線
    const plain = { ...g, directed: undefined };
    expect(edgeShape(plain, centers, g.edges[0])!.path).toContain('L');
  });
});

describe('editing a graph', () => {
  it('adds nodes with the next name and connects them without duplicates', () => {
    let doc = graphDoc();
    const added = addGraphNode(doc, 'g')!;
    expect(added.index).toBe(4);
    doc = added.doc;
    expect(graph(doc).nodes).toEqual(['0', '1', '2', '3', '4']);
    doc = addGraphEdge(doc, 'g', 3, 4);
    expect(graph(doc).edges).toContainEqual({ a: 3, b: 4 });
    // 無向圖 4-3 和 3-4 是同一條
    expect(addGraphEdge(doc, 'g', 4, 3)).toBe(doc);
    const letters = addGraphNode(graphDoc({ nodes: ['a', 'b'] }), 'g')!;
    expect(graph(letters.doc).nodes).toEqual(['a', 'b', 'c']);
  });

  it('deletes a node with its edges and keeps pointers on the right nodes', () => {
    let doc = addPointerAt(addPointerAt(graphDoc(), 'g', 1, 'p1'), 'g', 3, 'p3');
    doc = setGraphColor(doc, 'g', 3, 'green');
    doc = deleteGraphNode(doc, 'g', 1);
    expect(graph(doc).nodes).toEqual(['0', '2', '3']);
    // 0-1、1-3 跟著節點刪掉；0-2 變成 0-1
    expect(graph(doc).edges).toEqual([{ a: 0, b: 1 }]);
    expect(graph(doc).colors).toEqual([null, null, 'green']);
    expect((findElement(doc, 'p3') as ElementOf<'pointer'>).attach).toEqual({ id: 'g', index: 2 });
    expect((findElement(doc, 'p1') as ElementOf<'pointer'>).attach).toBeUndefined();
  });

  it('marks, weighs, and removes edges, and dedupes when made undirected', () => {
    let doc = updateGraphEdge(graphDoc(), 'g', 0, { mark: true, w: '4' });
    expect(graph(doc).edges[0]).toEqual({ a: 0, b: 1, mark: true, w: '4' });
    doc = updateGraphEdge(doc, 'g', 0, { mark: false, w: '' });
    expect(graph(doc).edges[0]).toEqual({ a: 0, b: 1 });
    doc = removeGraphEdge(doc, 'g', 0);
    expect(graph(doc).edges).toHaveLength(2);

    let directed = setDirected(graphDoc(), 'g', true);
    directed = addGraphEdge(directed, 'g', 1, 0);
    expect(graph(directed).edges).toHaveLength(4);
    const undirected = setDirected(directed, 'g', false);
    expect(graph(undirected).directed).toBeUndefined();
    expect(graph(undirected).edges).toHaveLength(3);
  });

  it('puts pointers above nodes, cycles them around the circle, and snaps them on drop', () => {
    let doc = addPointerAt(graphDoc(), 'g', 0, 'p');
    const pointer = () => findElement(doc, 'p') as ElementOf<'pointer'>;
    const c = graphLayout(graph(doc)).centers[0];
    expect(pointsDown(doc, pointer())).toBe(true);
    expect(pointerPosition(doc, pointer())).toEqual({ x: c.x - POINTER_W / 2, y: c.y - TREE_D / 2 - POINTER_H - 2 });
    doc = shiftPointer(doc, 'p', -1);
    expect(pointer().attach?.index).toBe(3);
    doc = shiftPointer(doc, 'p', 1);
    expect(pointer().attach?.index).toBe(0);
    const c2 = graphLayout(graph(doc)).centers[2];
    expect(snapTarget(doc, { x: c2.x - POINTER_W / 2, y: c2.y + TREE_D / 2 })).toEqual({ id: 'g', index: 2 });
  });
});

describe('building a graph from text', () => {
  it('reads an edge list with n, weights, and letters', () => {
    expect(parseGraph('n = 5, edges = [[0,1],[0,2],[1,3]]')).toEqual({
      nodes: ['0', '1', '2', '3', '4'],
      edges: [{ a: 0, b: 1 }, { a: 0, b: 2 }, { a: 1, b: 3 }],
    });
    expect(parseGraph('[[0,1,4],[1,2,3]]')).toEqual({ nodes: ['0', '1', '2'], edges: [{ a: 0, b: 1, w: '4' }, { a: 1, b: 2, w: '3' }] });
    expect(parseGraph(`[['a','b'],['b','c']]`)).toEqual({ nodes: ['a', 'b', 'c'], edges: [{ a: 0, b: 1 }, { a: 1, b: 2 }] });
    expect(parseGraph('n = 3')).toEqual({ nodes: ['0', '1', '2'], edges: [] });
  });

  it('reads adjacency lists, 0- or 1-based, and tells directed from undirected', () => {
    // 每個節點有三個鄰居，看得出不是邊的清單
    expect(parseGraph('[[1,2,3],[0],[0],[0]]')).toEqual({
      nodes: ['0', '1', '2', '3'],
      edges: [{ a: 0, b: 1 }, { a: 0, b: 2 }, { a: 0, b: 3 }],
      directed: false,
    });
    // Clone Graph：從 1 開始
    expect(parseGraph('adjList = [[2,4],[1,3],[2,4],[1,3]]')).toMatchObject({ nodes: ['1', '2', '3', '4'], directed: false });
    expect(parseGraph('graph = [[1],[2],[]]')).toEqual({ nodes: ['0', '1', '2'], edges: [{ a: 0, b: 1 }, { a: 1, b: 2 }], directed: true });
  });

  it('rejects what it cannot read or draw', () => {
    expect(parseGraph('')).toEqual({ error: 'empty' });
    expect(parseGraph('edges = [[0,1]')).toEqual({ error: 'badFormat' });
    expect(parseGraph('[1,2,3]')).toEqual({ error: 'badFormat' });
    expect(parseGraph(JSON.stringify(Array.from({ length: 21 }, (_, i) => [i, i + 1])))).toEqual({ error: 'tooMany' });
  });

  it('writes the graph back and replaces it from text', () => {
    expect(serializeGraph(graph(graphDoc()))).toBe('n = 4, edges = [[0,1],[0,2],[1,3]]');
    expect(serializeGraph(graph(graphDoc({ nodes: ['a', 'b'], edges: [{ a: 0, b: 1, w: 'x' }] })))).toBe('edges = [["a","b","x"]]');
    let doc = addPointerAt(graphDoc(), 'g', 3, 'p');
    const result = applyStructureText(doc, 'g', 'graph = [[1],[2],[]]');
    doc = (result as { doc: BoardDoc }).doc;
    expect(graph(doc)).toMatchObject({ nodes: ['0', '1', '2'], directed: true });
    expect((findElement(doc, 'p') as ElementOf<'pointer'>).attach).toBeUndefined();
  });
});

describe('saving and exporting graphs', () => {
  it('passes the sync schema and draws edges, weights, and nodes', () => {
    const doc = updateGraphEdge(setDirected(graphDoc(), 'g', true), 'g', 0, { w: '7', mark: true });
    expect(boardDocSchema.safeParse(doc).success).toBe(true);
    const svg = boardToSvg(doc, undefined, { measure: estimateWidth, front: 'front', back: 'back' })!.svg;
    expect(svg.match(/<circle /g)).toHaveLength(4);
    expect(svg).toContain('>7</text>');
    expect(svg).toContain('url(#head-orange)');
    expect(svg).toContain('url(#head-ink)');
  });
});
