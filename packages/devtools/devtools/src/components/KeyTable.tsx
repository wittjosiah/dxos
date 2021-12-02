//
// Copyright 2020 DXOS.org
//

import moment from 'moment'; // TODO(burdon): Remove.
import React from 'react';

import { TableBody, TableHead, TableRow } from '@mui/material';

import { keyTypeName } from '@dxos/credentials';
import { CopyText } from '@dxos/react-components';

import { KeyRecord } from '../proto/gen/dxos/halo/keys';
import { BooleanIcon } from './BooleanIcon';
import { Table, TableCell } from './Table';

const sorter = (a: KeyRecord, b: KeyRecord) => (a.type < b.type ? -1 : a.type > b.type ? 1 : a.own ? -1 : 1);

export interface KeyTableProps {
  keys: KeyRecord[]
}

export const KeyTable = ({ keys }: KeyTableProps) => {
  return (
    <Table
      stickyHeader
      size='small'
    >
      <TableHead>
        <TableRow>
          <TableCell sx={{ width: 80 }}>Type</TableCell>
          <TableCell>Public Key</TableCell>
          <TableCell sx={{ width: 180 }}>Added</TableCell>
          <TableCell>Ours</TableCell>
          <TableCell>Trusted</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {keys.sort(sorter).map(({ type, publicKey, added, own, trusted }) => {
          const key = publicKey.toHex();
          return (
            <TableRow key={key}>
              <TableCell monospace>
                {keyTypeName(type)}
              </TableCell>
              <TableCell title={key}>
                <CopyText sx={{ fontFamily: 'monospace' }} value={key} />
              </TableCell>
              <TableCell title={added}>
                {moment(added).fromNow()}
              </TableCell>
              <TableCell align='center'>
                <BooleanIcon value={own} />
              </TableCell>
              <TableCell align='center'>
                <BooleanIcon value={trusted} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};