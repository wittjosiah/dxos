//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Heading } from '@dxos/react-ui';
import { UntranslatedLoading, LoadingSize } from '@dxos/react-uikit';

export const ProviderFallback = ({ message }: { message: string }) => (
  <div className='py-8 flex flex-col gap-4' aria-live='polite'>
    <UntranslatedLoading label={message} size={LoadingSize.lg} />
    <Heading level={1} className='text-lg font-light text-center'>
      {message}
    </Heading>
  </div>
);