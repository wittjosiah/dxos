//
// Copyright 2022 DXOS.org
//

import React, { ComponentProps } from 'react';

import { defaultInput } from '../../styles/input';
import { mx } from '../../util';
import { InputProps, InputSize, InputSlots } from './InputProps';

const sizeMap: Record<InputSize, string> = {
  md: 'text-base',
  lg: 'text-lg',
  pin: '',
  textarea: ''
};

export type BareTextInputProps = Omit<InputProps, 'label' | 'initialValue' | 'onChange' | 'slots'> &
  Pick<ComponentProps<'input'>, 'onChange' | 'value'> & { inputSlot: InputSlots['input'] };

export const BareTextInput = ({
  validationValence,
  validationMessage,
  size,
  disabled,
  placeholder,
  onChange,
  value,
  inputSlot
}: BareTextInputProps) => {
  return (
    <input
      {...inputSlot}
      placeholder={placeholder}
      onChange={onChange}
      value={value}
      className={mx(
        defaultInput({
          disabled,
          ...(validationMessage && { validationValence })
        }),
        sizeMap[size ?? 'md'],
        'block w-full px-2.5 py-2',
        inputSlot?.className
      )}
    />
  );
};
