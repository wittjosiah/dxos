//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Button, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';

import { PublicKey } from '@dxos/keys';
import { SwarmInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { CopyText } from '@dxos/react-components';

import { BooleanIcon } from './BooleanIcon';

export interface SwarmListProps {
  swarms: SwarmInfo[];
  onClick?: (id: PublicKey) => void;
}

export const SwarmTable = ({ swarms, onClick }: SwarmListProps) => (
  <Table
    stickyHeader
    size='small'
    sx={{
      '& .MuiTableCell-root': {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      },

      '& th': {
        fontVariant: 'all-petite-caps'
      }
    }}
  >
    <TableHead>
      <TableRow>
        <TableCell sx={{ maxWidth: 200 }}>Label</TableCell>
        <TableCell sx={{ maxWidth: 200 }}>Topic</TableCell>
        <TableCell>Active</TableCell>
        <TableCell>Info</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {swarms.map((swarm) => (
        <TableRow key={swarm.id.toHex()}>
          <TableCell sx={{ maxWidth: 200 }}>{swarm.label && <CopyText value={swarm.label} />}</TableCell>
          <TableCell sx={{ maxWidth: 200 }}>
            <CopyText value={swarm.topic.toHex()} />
          </TableCell>
          <TableCell>
            <BooleanIcon value={swarm.isActive ? true : undefined} />
          </TableCell>
          <TableCell>
            <Button
              variant='contained'
              onClick={() => {
                onClick?.(swarm.id);
              }}
            >
              Info
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);
