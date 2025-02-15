//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { ChevronRight as ExpandIcon, ExpandMore as CollapseIcon } from '@mui/icons-material';
import { TreeItem, TreeView } from '@mui/lab';
import { Box } from '@mui/material';

import { Item } from '@dxos/client';
import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { MessengerModel } from '@dxos/messenger-model';
import { Model } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { useSpace, useSelection, useDevtools, useStream } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';
import { TextModel } from '@dxos/text-model';

import { KeySelect, Panel } from '../../components';

const ItemNode = ({ item, onSelect }: ItemNodeProps) => {
  const children = useSelection(item.select().children()) ?? [];

  return (
    <TreeItem nodeId={item.id} label={item.type ?? item.modelType ?? 'undefined'} onClick={() => onSelect(item)}>
      {children.map((child) => (
        <ItemNode key={child.id} item={child} onSelect={onSelect} />
      ))}
    </TreeItem>
  );
};

export const ItemsPanel = () => {
  const [selectedSpaceKey, setSelectedSpaceKey] = useState<PublicKey>();
  const [selectedItem, setSelectedItem] = useState<Item<any>>();

  const devtoolsHost = useDevtools();
  if (!devtoolsHost) {
    return null;
  }
  const spaces = useStream(() => devtoolsHost.subscribeToSpaces({}), {}).spaces ?? [];

  const space = useSpace(selectedSpaceKey);
  const items = useSelection(space?.select()) ?? [];

  return (
    <Panel
      controls={
        <KeySelect
          label='Space'
          keys={spaces.map(({ key }) => key)}
          selected={selectedSpaceKey}
          onChange={(key) => setSelectedSpaceKey(key)}
          humanize={true}
        />
      }
    >
      <Box display='flex' height='100%'>
        <TreeView
          defaultCollapseIcon={<CollapseIcon />}
          defaultExpandIcon={<ExpandIcon />}
          sx={{
            flex: 1,
            maxWidth: 300,
            overflowY: 'auto',
            height: '100%'
          }}
        >
          {items
            .filter((item) => !item.parent)
            .map((item) => (
              <ItemNode key={item.id} item={item} onSelect={setSelectedItem} />
            ))}
        </TreeView>

        <Box flex={1}>{selectedItem && <ItemDetails item={selectedItem} />}</Box>
      </Box>
    </Panel>
  );
};

interface ItemNodeProps {
  item: Item<any>;
  onSelect: (item: Item<any>) => void;
}

interface ItemDetailsProps {
  item: Item<Model<any>>;
}

const ItemDetails = ({ item }: ItemDetailsProps) => (
  <Box
    sx={{
      '& td': {
        verticalAlign: 'top'
      }
    }}
  >
    <table>
      <tbody>
        <tr>
          <td style={{ width: 100 }}>ID</td>
          <td>{truncateKey(item.id, 8)}</td>
        </tr>
        <tr>
          <td>Model</td>
          <td>{item.model.modelMeta.type}</td>
        </tr>
        <tr>
          <td>Type</td>
          <td>{item.type}</td>
        </tr>
        <tr>
          <td>Deleted</td>
          <td>{item.deleted ? 'Yes' : 'No'}</td>
        </tr>
        <tr>
          <td>Properties</td>
          <td>
            <JsonTreeView data={modelToObject(item.model)} />
          </td>
        </tr>
      </tbody>
    </table>
  </Box>
);

const modelToObject = (model: Model<any>) => {
  if (model instanceof ObjectModel) {
    return model.toObject();
  } else if (model instanceof TextModel) {
    return model.textContent;
  } else if (model instanceof MessengerModel) {
    return model.messages;
  }

  return model.toJSON();
};
