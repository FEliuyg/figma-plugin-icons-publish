import {
  checkIconsDuplicate,
  checkIconsName,
  exportIconsSvg,
  getIconsFromCurrentPage,
} from './utils/heler';

figma.showUI(__html__, {
  width: 320,
  height: 400,
});

export interface PluginMessage {
  type: string;
  data: unknown;
}

const getContent = () => {
  return fetch(
    `https://gitlab.prod.dtstack.cn/api/v4/projects/1192/repository/files/package.json/raw?ref=master`,
    {
      headers: {
        'content-type': 'application/json',
        'PRIVATE-TOKEN': 'PseHqaSyyRtRnM9j54XL',
      },
    }
  ).then((response) => response.json());
};

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

    case 'getIcons': {
      const icons = getIconsFromCurrentPage(figma.currentPage);
      if (icons.length === 0) {
        figma.notify(
          'Cannot find icons in current page.Icon must be a Component Node in the Frame that name is ends with "Outlined", "Filled" or "Colored"'
        );
        return;
      }

      const nameNotStandardIcons = checkIconsName(icons);

      if (nameNotStandardIcons.length > 0) {
        figma.notify(
          `Icons name not standard: ${nameNotStandardIcons.map((icon) => `${icon.node.name} in ${icon.type}`).join(', ')}`
        );
        return;
      }

      const duplicatedIcons = checkIconsDuplicate(icons);

      if (duplicatedIcons.length > 0) {
        figma.notify(
          `Duplicated icons: ${duplicatedIcons.map((icon) => `${icon.node.name} in ${icon.type}`).join(', ')}`
        );
        return;
      }

      exportIconsSvg(icons).then((res) => {
        figma.ui.postMessage({ type: 'getIconsSuccess', data: res } as PluginMessage);
        getContent();
      });

      break;
    }
  }
};
