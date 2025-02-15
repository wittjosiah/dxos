//
// Copyright 2022 DXOS.org
//

import React, { ComponentProps, PropsWithChildren, ReactNode } from 'react';

import { MessageValence } from '../../props';
import { mx } from '../../util';

export interface TagProps extends ComponentProps<'span'> {
  valence?: MessageValence;
  children?: ReactNode;
}

const valenceColorMap: Record<MessageValence, string> = {
  neutral: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300',
  success: 'bg-success-100 text-success-800 dark:bg-success-700 dark:text-success-300',
  info: 'bg-info-100 text-info-800 dark:bg-info-700 dark:text-info-300',
  warning: 'bg-warning-100 text-warning-800 dark:bg-warning-700 dark:text-warning-300',
  error: 'bg-error-100 text-error-800 dark:bg-error-700 dark:text-error-300'
};

export const Tag = ({ children, valence = 'neutral', ...rootSlot }: PropsWithChildren<TagProps>) => {
  return (
    <span
      {...rootSlot}
      className={mx('text-xs font-semibold px-2.5 py-0.5 rounded', valenceColorMap[valence], rootSlot?.className)}
    >
      {children}
    </span>
  );
};
