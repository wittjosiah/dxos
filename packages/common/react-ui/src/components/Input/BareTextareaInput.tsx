//
// Copyright 2022 DXOS.org
//

import React, { ComponentProps } from 'react';

import { defaultInput } from '../../styles/input';
import { mx } from '../../util';
import { TextareaProps, TextareaSlots } from './InputProps';

export type BareTextareaInputProps = Omit<TextareaProps, 'label' | 'initialValue' | 'onChange' | 'slots'> &
  Pick<ComponentProps<'textarea'>, 'onChange' | 'value'> & { inputSlot: TextareaSlots['input'] };

export const BareTextareaInput = ({
  validationValence,
  validationMessage,
  onChange,
  value,
  disabled,
  placeholder,
  inputSlot
}: BareTextareaInputProps) => {
  return (
    <textarea
      {...inputSlot}
      placeholder={placeholder}
      onChange={onChange}
      value={value}
      className={mx(
        defaultInput({
          disabled,
          ...(validationMessage && { validationValence })
        }),
        'block w-full px-2.5 py-2',
        inputSlot?.className
      )}
    />
  );
};
