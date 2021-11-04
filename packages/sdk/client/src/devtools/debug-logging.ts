//
// Copyright 2020 DXOS.org
//

import { DevtoolsServiceDependencies } from '..';
import { EnableDebugLoggingRequest } from '../proto/gen/dxos/devtools';

/* Note that we can not simply import the debug module here and call its enable, disable
 * functions -- if we did that we'd be calling a different instance of the createDebug
 * object, with the result that we wouldn't change the log output from the application.
 */

export const enableDebugLogging = (hook: DevtoolsServiceDependencies, data: EnableDebugLoggingRequest) => {
  hook.debug.enable(data.namespaces);
};

export const disableDebugLogging = (hook: DevtoolsServiceDependencies) => {
  hook.debug.disable();
};