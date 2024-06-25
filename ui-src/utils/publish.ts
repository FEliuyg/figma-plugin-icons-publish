import { RepoInfo } from '../Settings';
import { githubPublish } from './github';
import { gitlabPublish } from './gitlab';

export interface IconsProps {
  id: string;
  name: string;
  content: Uint8Array;
}

export async function publishIcons(params: RepoInfo, icons: IconsProps[]) {
  console.log('params:', params);
  if (params.type === 'gitlab') {
    return gitlabPublish(params, icons);
  } else {
    return githubPublish(params, icons);
  }
}
