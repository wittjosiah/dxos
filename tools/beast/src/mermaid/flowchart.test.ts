//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { describe, test } from '@dxos/test';

import { Flowchart } from './flowchart';

describe('Mermaid builder', () => {
  test('Flowchart', () => {
    const flowchart = new Flowchart({
      linkStyle: { stroke: 'green' }
    });

    flowchart.addClassDef('test', { fill: 'red' });
    flowchart
      .addSubgraph({
        id: 'G1',
        style: {
          fill: '#EEE',
          'stroke-width': 'none'
        }
      })
      .addNode({
        id: 'A',
        label: 'Test',
        className: 'test',
        href: 'https://dxos.org'
      })
      .addNode({
        id: 'B',
        style: { fill: 'blue', 'stroke-width': '4px' }
      })
      .addSubgraph({ id: 'G2', label: ' ' })
      .addNode({ id: 'C' });

    flowchart.addSubgraph({ id: 'G3' });
    flowchart.addNode({ id: 'D' });
    flowchart
      .addLink({ source: 'A', target: 'B' })
      .addLink({ source: 'B', target: 'C' })
      .addLink({
        source: 'B',
        target: 'D',
        style: {
          stroke: 'red'
        }
      });

    const output = flowchart.render();
    expect(output).toBeTruthy();
    console.log(output);
  });
});
