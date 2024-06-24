import { RepoInfo } from '../Settings';
import { diffCache, generateCaches, getNextVersion } from './helper';
import { IconsProps } from './publish';

const getHeaders = (token: string) => {
  return {
    'content-type': 'application/json',
    'PRIVATE-TOKEN': `${token}`,
  };
};

export const getContent = (filePath: string, gitlabData: RepoInfo, branch?: string) => {
  if (gitlabData && gitlabData.url && gitlabData.projectId && gitlabData.token && filePath) {
    return fetch(
      `${getUrlOrigin(gitlabData.url)}/api/v4/projects/${gitlabData.projectId}/repository/files/${filePath}/raw?ref=${branch || gitlabData.branch}`,
      {
        headers: getHeaders(gitlabData.token),
      }
    ).then((response) => {
      if (response.ok) {
        return response.json();
      }
    });
  }
};

export const createBranch = async (gitlabData: RepoInfo) => {
  const branchName = `figma-update-${new Date().getTime()}`;
  return fetch(
    `${getUrlOrigin(gitlabData.url)}/api/v4/projects/${gitlabData.projectId}/repository/branches?branch=${branchName}&ref=${gitlabData.branch}`,
    {
      headers: {
        'PRIVATE-TOKEN': `${gitlabData.token}`,
      },
      method: 'POST',
    }
  ).then((response) => response.json());
};

export const updatePackage = async (
  message: string,
  contents: string,
  branch: string,
  gitlabData: RepoInfo
) => {
  const content = JSON.stringify(contents, null, 2);
  const body = JSON.stringify({
    branch,
    content,
    commit_message: message,
  });

  return fetch(
    `${getUrlOrigin(gitlabData.url)}/api/v4/projects/${gitlabData.projectId}/repository/files/package.json`,
    {
      headers: getHeaders(gitlabData.token),
      body,
      method: 'PUT',
    }
  ).then((response) => response.json());
};

export const createMergeRequest = async (
  title: string,
  content: string,
  branchName: string,
  gitlabData: RepoInfo
) => {
  const body = {
    title,
    description: content,
    source_branch: branchName,
    target_branch: gitlabData.branch,
    remove_source_branch: true,
  };
  return fetch(
    `${getUrlOrigin(gitlabData.url)}/api/v4/projects/${gitlabData.projectId}/merge_requests`,
    {
      headers: getHeaders(gitlabData.token),
      body: JSON.stringify(body),
      method: 'POST',
    }
  ).then((response) => response.json());
};

export const getRunningJobs = (gitlabData: RepoInfo) => {
  return fetch(
    `${getUrlOrigin(gitlabData.url)}/api/v4/projects/${gitlabData.projectId}/jobs?scope=running`,
    {
      headers: getHeaders(gitlabData.token),
    }
  ).then((response) => response.json());
};

export function cancelJob(jobId: string, gitlabData: RepoInfo) {
  return fetch(
    `${getUrlOrigin(gitlabData.url)}/api/v4/projects/${gitlabData.projectId}/jobs/${jobId}/cancel`,
    {
      headers: getHeaders(gitlabData.token),
    }
  );
}

export async function acceptMergeRequest(mergeRequestIid: string, gitlabData: RepoInfo) {
  return fetch(
    `${getUrlOrigin(gitlabData.url)}/api/v4/projects/${gitlabData.projectId}/merge_requests/${mergeRequestIid}/merge`,
    {
      method: 'PUT',
      headers: getHeaders(gitlabData.token),
      body: JSON.stringify({
        should_remove_source_branch: true,
      }),
    }
  ).then((res) => {
    if (res.status >= 400) {
      throw Error('传参错误');
    }
  });
}

export async function createFile(
  filePath: string,
  content: BufferSource,
  branch: string,
  gitlabData: RepoInfo
) {
  const stringContent = new TextDecoder().decode(content);
  const body = JSON.stringify({
    branch,
    content: stringContent,
    commit_message: `add file: ${filePath}`,
  });

  return fetch(
    `${getUrlOrigin(gitlabData.url)}/api/v4/projects/${
      gitlabData.projectId
    }/repository/files/${encodeURIComponent(filePath)}`,
    {
      headers: getHeaders(gitlabData.token),
      body,
      method: 'PUT',
    }
  );
}

interface CommitProps {
  action: string;
  file_path: string;
  content?: string;
}

export async function createCommits(commits: CommitProps[], branch: string, gitlabData: RepoInfo) {
  const body = JSON.stringify({
    branch,
    commit_message: '[Figma]: add icons',
    actions: commits,
  });

  return fetch(
    `${getUrlOrigin(gitlabData.url)}/api/v4/projects/${gitlabData.projectId}/repository/commits`,
    {
      headers: getHeaders(gitlabData.token),
      body,
      method: 'POST',
    }
  ).then((res) => {
    if (res.status >= 400) {
      throw Error('传参错误');
    }
  });
}

export function getUrlOrigin(url: string) {
  return new URL(url).origin;
}

export async function gitlabPublish(gitlabData: RepoInfo, icons: IconsProps[]) {
  // 0. generate icons cache
  // 1. create a new branch
  // 2. get content of package.json
  // 3. get content of cache.json
  // 4. diff cache.json
  // 5. create a commit
  // 6. create a merge request
  // 7. wait for merge request to be merged

  const newCaches = generateCaches(icons);
  const { name: branchName } = await createBranch(gitlabData);
  const packageJson = await getContent('package.json', gitlabData, branchName);
  packageJson.version = getNextVersion(packageJson.version);
  const preCaches = await getContent('cache.json', gitlabData, branchName);
  const diffResult = diffCache(newCaches, preCaches);

  if (diffResult.length === 0) {
    throw Error('There is nothing to update');
  }

  const commits: CommitProps[] = [
    {
      action: 'update',
      file_path: 'package.json',
      content: JSON.stringify(packageJson, null, 2),
    },
    {
      action: preCaches ? 'update' : 'create',
      file_path: 'cache.json',
      content: JSON.stringify(newCaches, null, 2),
    },
    ...diffResult.map((d) => {
      const icon = icons.find((icon) => icon.id === d.id);
      return {
        action: d.action,
        file_path: `src/svg/${d.componentName}.svg`,
        content: d.action === 'delete' ? undefined : new TextDecoder().decode(icon?.content),
      };
    }),
  ];

  await createCommits(commits, branchName, gitlabData);

  let message = '';
  const getTypeSvgs = (type: 'update' | 'create' | 'delete') =>
    diffResult.filter((d) => d.action === type).map((d) => d.componentName);
  const addedSvgs = getTypeSvgs('create');
  const updatedSvgs = getTypeSvgs('update');
  const deletedSvgs = getTypeSvgs('delete');
  if (addedSvgs.length) {
    message += `add：${addedSvgs.join(',')}\n`;
  }
  if (updatedSvgs.length) {
    message += `update：${addedSvgs.join(',')}\n`;
  }
  if (updatedSvgs.length) {
    message += `delete：${deletedSvgs.join(',')}\n`;
  }

  const { iid } = await createMergeRequest(
    `[figma]: update to ${packageJson.version}`,
    message,
    branchName,
    gitlabData
  );

  await acceptMergeRequest(iid, gitlabData);
}
