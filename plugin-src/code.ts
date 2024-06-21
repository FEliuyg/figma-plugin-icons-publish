figma.showUI(__html__, {
  width: 320,
  height: 400,
});

export interface PluginMessage {
  type: string;
  data: unknown;
}

figma.ui.onmessage = (msg: PluginMessage) => {
  const { type, data } = msg;
  switch (type) {
    case 'getData': {
      figma.clientStorage.getAsync('repoInfo').then((data) => {
        if (data) {
          figma.ui.postMessage({ type: 'getDataSuccess', data } as PluginMessage);
        }
      });
      break;
    }

    case 'saveData': {
      figma.clientStorage.setAsync('repoInfo', data).then(() => {
        figma.ui.postMessage({ type: 'saveDataSuccess' } as PluginMessage);
      });
      break;
    }

    case 'notify': {
      figma.notify(data as string);
      break;
    }
  }
};
