//
// Copyright 2022 DXOS.org
//

import { SourcemapMap } from '@swc-node/sourcemap-support';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, extname, join, parse } from 'path';
import { addHook } from 'pirates';

import { ID_BUGCHECK_STRING, preprocess } from './preprocessor';
import { combineSourceMaps } from './source-map';

// TODO(dmaretskyi): Move to separate package in tools.

// Here be dragons.
export const register = () => {
  addHook(
    (code, filename) => {
      try {
        const output = preprocess(code, filename);

        // Clear the source map in case we are running the tests in watch mode.
        // Otherwise, it will compose new source maps on top of the ones from the previous compilation round.
        //
        // NOTE: We are assuming that this is the first compilation step.
        SourcemapMap.delete(filename);

        if (output.map) {
          SourcemapMap.set(filename, output.map);
        }

        // Dump code for debugging
        const DUMP = false;
        if (DUMP) {
          // TODO(burdon): Decide on better place to put debug files.
          const sourceMap = getSourceMap(filename);
          const path = join('/tmp/dx-log', 'trace-compiled', filename);
          mkdirSync(dirname(path), { recursive: true });
          writeFileSync(path, output.code, { encoding: 'utf-8' });
          writeFileSync(`${dirname(path)}/${parse(path).name}.orig${extname(path)}`, code, { encoding: 'utf-8' });
          if (sourceMap) {
            writeFileSync(`${dirname(path)}/${parse(path).name}.orig${extname(path)}.map`, sourceMap!, {
              encoding: 'utf-8'
            });
          }
        }

        return output.code;
      } catch (err) {
        console.error(err);
        throw err;
      }
    },
    {
      extensions: ['.ts']
    }
  );

  const getSourceMap = (filename: string): string | undefined => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { retrieveSourceMap } = require('source-map-support');
      const sourceMap = retrieveSourceMap(filename);
      if (sourceMap) {
        return typeof sourceMap.map === 'string' ? sourceMap.map : JSON.stringify(sourceMap.map);
      }
    } catch (err) {}

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { SourcemapMap } = require('@swc-node/sourcemap-support');
      const sourceMap = SourcemapMap.get(filename);
      if (sourceMap) {
        return sourceMap;
      }
    } catch (err) {}

    return undefined;
  };

  registerGlobals();

  patchSourceMaps();
};

export const BUGCHECK_STRING =
  'If you see this message then it means that the source code preprocessor for @dxos/log is broken.' +
  ' It probably has misinterpreted an unrelated call for a logger invocation.';

const registerGlobals = () => {
  (globalThis as any)[ID_BUGCHECK_STRING] = BUGCHECK_STRING;
};

/**
 * Patches @swc-node/sourcemap-support to combine source maps from multiple compilation steps.
 *
 * We have two compilation steps: the logger preprocessor that inserts log metadata,
 * and the SWC TS to JS compiler.
 * There's a bug in SWC which makes it ignore the input source map from the previous compilation step.
 *
 * The source maps get put into the SourcemapMap from @swc-node/sourcemap-support.
 * We patch the set method to check if there's already a source map from the previous compilation step,
 * and combine then together.
 */
function patchSourceMaps() {
  const orig = SourcemapMap.set;
  SourcemapMap.set = function (this: typeof SourcemapMap, key: string, value: string) {
    if (SourcemapMap.get(key)) {
      return orig.call(this, key, combineSourceMaps(SourcemapMap.get(key), value));
    } else {
      return orig.call(this, key, value);
    }
  } as any;
}
