//
// Copyright 2022 DXOS.org
//

import { spawnSync } from 'child_process';

import type { PackageModule, Logger } from './common';

export interface BuildParams {
  log: Logger;
  module: PackageModule;
}

interface BuildArgs {
  verbose?: boolean;
}

export const build = ({ verbose }: BuildArgs, { log, module }: BuildParams) => {
  log(`Building module ${module.name}...`);

  const [command, ...args] = module.build!.command!.split(' ');

  // Build with configuration.
  const { status } = spawnSync(command, args, {
    env: {
      ...process.env,
      CONFIG_DYNAMIC: 'true'
    },
    stdio: verbose ? 'inherit' : undefined
  });

  if (status) {
    log(`Build failed.${verbose ? '' : ' Re-run with --verbose for more details.'}`);
    process.exit(status);
  }

  log('Build succeded.');
};
