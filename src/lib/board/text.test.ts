import { describe, expect, it } from 'vitest';
import { addElement, addPointerAt, createElement, EMPTY_DOC, findElement, type BoardDoc, type ElementOf } from './model';
import { applyStructureText, parseDict, parseGrid, parseList, splitName, structureText } from './structures';

const texts = { heading: 'Title', text: 'Text', sticky: 'Idea' };

function docWith(kind: Parameters<typeof createElement>[0]): BoardDoc {
  return addElement(EMPTY_DOC, createElement(kind, { x: 0, y: 0 }, 'e', texts));
}

const el = <T extends 'list' | 'table' | 'tree'>(doc: BoardDoc) => findElement(doc, 'e') as ElementOf<T>;

describe('reading values from text', () => {
  it('takes the name and the first value from a LeetCode example', () => {
    expect(splitName('nums = [2,7,11,15], target = 9')).toEqual({ name: 'nums', body: '[2,7,11,15]' });
    expect(splitName('[1,2]')).toEqual({ body: '[1,2]' });
  });

  it('reads lists in several shapes, and splits a quoted string into characters', () => {
    expect(parseList('[1, 2, 3, 4]')).toEqual({ items: ['1', '2', '3', '4'] });
    expect(parseList('1 2 3')).toEqual({ items: ['1', '2', '3'] });
    expect(parseList(`stack = ['(', '[']`)).toEqual({ items: ['(', '['], name: 'stack' });
    expect(parseList('[1, None, True]')).toEqual({ items: ['1', 'null', 'true'] });
    expect(parseList('s = "abcab"')).toEqual({ items: ['a', 'b', 'c', 'a', 'b'], name: 's' });
    expect(parseList('[[1,2]]')).toEqual({ error: 'badFormat' });
    expect(parseList('[]')).toEqual({ error: 'empty' });
  });

  it('reads grids and dicts', () => {
    expect(parseGrid('grid = [["1","0"],["0","1"]]')).toEqual({ rows: [['1', '0'], ['0', '1']], name: 'grid' });
    expect(parseGrid('[1,0,1]')).toEqual({ rows: [['1', '0', '1']] });
    expect(parseGrid('1,0')).toEqual({ error: 'badFormat' });
    expect(parseDict(`{'a': 1, 'b': [2, 3]}`)).toEqual({ rows: [['a', '1'], ['b', '[2,3]']] });
    expect(parseDict('count = {a: 1, b: 2}')).toEqual({ rows: [['a', '1'], ['b', '2']], name: 'count' });
    expect(parseDict('[["x", 1]]')).toEqual({ rows: [['x', '1']] });
    expect(parseDict('{}')).toEqual({ error: 'empty' });
  });
});

describe('building elements from text', () => {
  it('fills an array, renames it, and drops pointers past the end', () => {
    let doc = addPointerAt(addPointerAt(docWith('array'), 'e', 1, 'i'), 'e', 3, 'j');
    doc = (applyStructureText(doc, 'e', 'nums = [2,7,11], target = 9') as { doc: BoardDoc }).doc;
    expect(el<'list'>(doc)).toMatchObject({ label: 'nums', items: ['2', '7', '11'] });
    expect((findElement(doc, 'i') as ElementOf<'pointer'>).attach).toEqual({ id: 'e', index: 1 });
    expect((findElement(doc, 'j') as ElementOf<'pointer'>).attach).toBeUndefined();
    // 寫回去的文字可以再讀回來
    expect(structureText(el<'list'>(doc))).toBe('nums = [2,7,11]');
  });

  it('fills stacks, sets, dicts, grids, and names trees and linked lists', () => {
    const stack = (applyStructureText(docWith('stack'), 'e', '[1,2,3]') as { doc: BoardDoc }).doc;
    expect(el<'list'>(stack).items).toEqual(['1', '2', '3']);
    const dict = (applyStructureText(docWith('dict'), 'e', `{'x': 3}`) as { doc: BoardDoc }).doc;
    expect(el<'table'>(dict)).toMatchObject({ label: 'count', rows: [['x', '3']] });
    expect(structureText(el<'table'>(dict))).toBe('count = {"x": 3}');
    const grid = (applyStructureText(docWith('grid'), 'e', '[[1,1],[0,1]]') as { doc: BoardDoc }).doc;
    expect(structureText(el<'table'>(grid))).toBe('grid = [[1,1],[0,1]]');
    const tree = (applyStructureText(docWith('binaryTree'), 'e', 'root = [4,2,7]') as { doc: BoardDoc }).doc;
    expect(el<'tree'>(tree)).toMatchObject({ label: 'root', nodes: ['4', '2', '7'] });
    const list = (applyStructureText(docWith('linkedList'), 'e', 'head = [1,2,3,4,5]') as { doc: BoardDoc }).doc;
    expect(el<'list'>(list)).toMatchObject({ label: 'head', items: ['1', '2', '3', '4', '5'] });
    expect(applyStructureText(docWith('grid'), 'e', 'not a grid')).toEqual({ error: 'badFormat' });
  });
});
