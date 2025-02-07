//
// Copyright 2022 DXOS.org
//

import cliProgress from 'cli-progress';
import fs from 'fs';
import folderSize from 'get-folder-size';
import assert from 'node:assert';
import { join } from 'path';
import { promisify } from 'util';

import type { Config } from '@dxos/client';

import { Logger, PackageModule } from './common';
import { uploadToIPFS } from './ipfs-upload';

const DEFAULT_OUTDIR = 'out';

const getFolderSize = promisify(folderSize);

/**
 * Encodes DXN string to fs path.
 *
 * Example: `example:app/braneframe` => `example/app/braneframe`
 */
const encodeName = (name: string) => name.replaceAll(':', '/');

export interface PublishParams {
  config?: Config;
  log: Logger;
  module: PackageModule;
}

interface PublishArgs {
  verbose?: boolean;
  pin?: boolean;
  timeout?: string | number;
  path?: string;
  config?: string;
}

export const publish = async ({ verbose, timeout, path, pin }: PublishArgs, { log, config, module }: PublishParams) => {
  assert(module.name, 'Module name is required to publish.');
  log(`Uploading ${module.name}...`);

  const moduleOut = `out/${encodeName(module.name)}`;
  const outdir = path ?? module.build?.outdir ?? (fs.existsSync(moduleOut) ? moduleOut : DEFAULT_OUTDIR);
  const publishFolder = join(process.cwd(), outdir);
  const total = await getFolderSize(publishFolder);

  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  verbose && bar.start(total, 0);

  const cid = await uploadToIPFS(publishFolder, config, {
    timeout: timeout || '10m',
    pin,
    progress: verbose ? (bytes: any) => bar.update(bytes) : undefined
  });

  verbose && bar.update(total);
  verbose && bar.stop();

  log(`Uploaded ${module.name} to IPFS with cid ${cid.toString()}.`);

  return cid;
};
