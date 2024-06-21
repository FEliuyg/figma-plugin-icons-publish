interface IconComponentsProps {
  type: string;
  node: ComponentNode;
}

const iconTypeReg = /(Outlined|Filled|Colored)$/;

export function getIconsFromCurrentPage(pageNode: PageNode) {
  const iconComponents: IconComponentsProps[] = [];

  function traverse(node: SceneNode, iconType: string) {
    if (node.type === 'COMPONENT') {
      iconComponents.push({
        type: iconType,
        node: node,
      });
    } else if ('children' in node) {
      node.children.forEach((child) => traverse(child, iconType));
    }
  }

  const iconFrames = pageNode.children.filter(isIconFrame);

  iconFrames.forEach((item) => traverse(item, getIconType(item.name)));

  return iconComponents;
}

export function checkIconsName(icons: IconComponentsProps[]) {
  return icons.filter((icon) => !isNameStandardComponent(icon.node));
}

export function checkIconsDuplicate(icons: IconComponentsProps[]) {
  const iconNames = new Set<string>();
  const duplicatedIcons: IconComponentsProps[] = [];
  icons.forEach((icon) => {
    const name = `${icon.node.name}${icon.type}`;
    if (iconNames.has(name)) {
      duplicatedIcons.push(icon);
    } else {
      iconNames.add(name);
    }
  });

  return duplicatedIcons;
}

export async function exportIconsSvg(icons: IconComponentsProps[]) {
  return Promise.all(
    icons.map(async (icon) => ({
      id: icon.node.id,
      name: `${icon.node.name}${icon.type}`,
      content: await icon.node.exportAsync({
        format: 'SVG',
      }),
    }))
  );
}

function getIconType(name: string) {
  let matches = name.match(iconTypeReg);
  if (matches) {
    return matches[1];
  } else {
    return 'Outlined';
  }
}

function isNameStandardComponent(node: ComponentNode) {
  return /^[A-Z][0-9a-zA-Z]+$/.test(node.name);
}

function isIconFrame(node: SceneNode) {
  return iconTypeReg.test(node.name) && node.type === 'FRAME';
}
