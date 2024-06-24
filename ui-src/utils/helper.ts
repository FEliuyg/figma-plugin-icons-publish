import md5 from 'md5';
import { IconsProps } from './publish';

export const getNextVersion = (version: string, breakingChange?: boolean) => {
  const versionArr = version.split('.');
  if (breakingChange) {
    versionArr[0] = '' + (+versionArr[0] + 1);
    versionArr[2] = '' + 0;
  } else {
    versionArr[1] = '' + (+versionArr[1] + 1);
    versionArr[2] = '' + 0;
  }

  return versionArr.join('.');
};

interface CacheIconProps {
  componentName: string;
  tag: string;
}

export function generateCaches(icons: IconsProps[]) {
  return icons.reduce(
    (result, svg) => {
      result[svg.id] = {
        componentName: svg.name,
        tag: md5(svg.content),
      };
      return result;
    },
    {} as Record<string, CacheIconProps>
  );
}

export function diffCache(
  current: Record<string, CacheIconProps>,
  prev?: Record<string, CacheIconProps>
) {
  if (!prev) {
    return Object.keys(current).map((d) => ({
      id: d,
      action: 'create',
      componentName: current[d].componentName,
    }));
  }

  const result: { id: string; action: string; componentName: string }[] = [];
  // 第一轮遍历，找出新增 或者 更新的, componentName 的更新转换为两步，删除原来的，新增
  Object.keys(current).map((currentSvgId) => {
    if (!prev[currentSvgId]) {
      result.push({
        id: currentSvgId,
        action: 'create',
        componentName: current[currentSvgId].componentName,
      });
    } else if (prev[currentSvgId].componentName !== current[currentSvgId].componentName) {
      result.push({
        id: currentSvgId,
        action: 'delete',
        componentName: prev[currentSvgId].componentName,
      });
      result.push({
        id: currentSvgId,
        action: 'create',
        componentName: current[currentSvgId].componentName,
      });
    } else if (prev[currentSvgId].tag !== current[currentSvgId].tag) {
      result.push({
        id: currentSvgId,
        action: 'update',
        componentName: current[currentSvgId].componentName,
      });
    }
  });

  // 第二轮遍历，找出删除的
  Object.keys(prev).map((prevSvgId) => {
    if (!current[prevSvgId]) {
      result.push({
        id: prevSvgId,
        action: 'delete',
        componentName: prev[prevSvgId].componentName,
      });
    }
  });

  return result
    .filter((d) => d.action === 'delete')
    .concat(result.filter((d) => d.action !== 'delete'));
}
