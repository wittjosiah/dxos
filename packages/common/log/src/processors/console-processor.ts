//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import pickBy from 'lodash.pickby';
import { inspect } from 'node:util';

import { LogConfig, LogLevel, shortLevelName } from '../config';
import { LogProcessor, shouldLog } from '../context';
import { gatherLogInfoFromScope } from '../scope';

const LEVEL_COLORS: Record<LogLevel, typeof chalk.ForegroundColor> = {
  [LogLevel.DEBUG]: 'gray',
  [LogLevel.INFO]: 'white',
  [LogLevel.WARN]: 'yellow',
  [LogLevel.ERROR]: 'red'
};

export const truncate = (text?: string, length = 0, right = false) => {
  const str = text && length ? (right ? text.slice(-length) : text.substring(0, length)) : text ?? '';
  return right ? str.padStart(length, ' ') : str.padEnd(length, ' ');
};

const getRelativeFilename = (filename: string) => {
  // TODO(burdon): Hack uses "packages" as an anchor (pre-parse NX?)
  // Including `packages/` part of the path so that excluded paths (e.g. from dist) are clickable in vscode.
  const match = filename.match(/.+\/(packages\/.+\/.+)/);
  if (match) {
    const [, filePath] = match;
    return filePath;
  }

  return filename;
};

// TODO(burdon): Optional timestamp.
// TODO(burdon): Optional package name.
// TODO(burdon): Show exceptions on one line.
export type FormatParts = {
  path?: string;
  line?: number;
  level: LogLevel;
  message: string;
  context?: any;
  error?: Error;
};

export type Formatter = (config: LogConfig, parts: FormatParts) => (string | undefined)[];

export const DEFAULT_FORMATTER: Formatter = (config, { path, line, level, message, context, error }) => {
  const column = config.options?.formatter?.column;

  const filepath = path !== undefined && line !== undefined ? chalk.grey(`${path}:${line}`) : undefined;

  return [
    // NOTE: File path must come fist for console hyperlinks.
    // Must not truncate for terminal output.
    filepath,
    column && filepath ? ''.padStart(column - filepath.length) : undefined,
    chalk[LEVEL_COLORS[level]](column ? shortLevelName[level] : LogLevel[level]),
    message,
    context,
    error
  ];
};

export const SHORT_FORMATTER: Formatter = (config, { path, level, message }) => [
  chalk.grey(truncate(path, 16, true)), // NOTE: Breaks terminal linking.
  chalk[LEVEL_COLORS[level]](shortLevelName[level]),
  message
];

// TODO(burdon): Config option.
const formatter = DEFAULT_FORMATTER;

export const CONSOLE_PROCESSOR: LogProcessor = (config, entry) => {
  let { level, message, context, meta, error } = entry;
  if (!shouldLog(config, level, meta?.file ?? '')) {
    return;
  }

  const parts: FormatParts = { level, message, error };

  if (meta) {
    parts.path = getRelativeFilename(meta.file);
    parts.line = meta.line;

    // TODO(dmaretskyi): Add the same to the browser-processor.
    const scopeInfo = gatherLogInfoFromScope(meta.scope);
    if (Object.keys(scopeInfo).length > 0) {
      context = Object.assign(context ?? {}, scopeInfo);
    }
  }

  if (context instanceof Error) {
    // Additional context from Error.
    const c = (context as any).context;
    // If ERROR then show stacktrace.
    parts.context = inspect(level === LogLevel.ERROR ? context : { error: context?.stack ?? String(context), ...c }, {
      colors: true
    });
  } else if (context && Object.keys(context).length > 0) {
    // Remove undefined fields.
    // https://nodejs.org/api/util.html#utilinspectobject-options
    // Remove undefined fields.
    // https://nodejs.org/api/util.html#utilinspectobject-options
    parts.context = inspect(
      pickBy(context, (value?: unknown) => value !== undefined),
      { depth: config.options.depth, colors: true, maxArrayLength: 8, sorted: false }
    );
  }

  const line = formatter(config, parts).filter(Boolean).join(' ');
  console.log(line);
};
