import { RepoInfo } from '../Settings';

const getHeaders = (token: string) => {
  return {
    'content-type': 'application/json',
    'PRIVATE-TOKEN': `${token}`,
  };
};

export const getContent = (filePath: string, gitlabData: RepoInfo) => {
  if (gitlabData && gitlabData.url && gitlabData.projectId && gitlabData.token && filePath) {
    return fetch(
      `${getUrlOrigin(gitlabData.url)}/api/v4/projects/${gitlabData.projectId}/repository/files/${filePath}/raw?ref=master`,
      {
        headers: getHeaders(gitlabData.token),
      }
    ).then((response) => response.json());
  }
};

export const createBranch = async (gitlabData: RepoInfo) => {
  const branchName = `figma-update-${new Date().getTime()}`;
  return fetch(
    `${getUrlOrigin(gitlabData.url)}/api/v4/projects/${gitlabData.projectId}/repository/branches?branch=${branchName}&ref=master`,
    {
      headers: {
        'PRIVATE-TOKEN': `${gitlabData.token}`,
      },
      method: 'POST',
    }
  ).then((response) => response.json());
};

export const updatePackage = (
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

export const createMergeRequest = (
  title: string,
  content: string,
  branchName: string,
  gitlabData: RepoInfo
) => {
  const body = {
    title,
    description: content,
    source_branch: branchName,
    target_branch: 'master',
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

export async function createCommits(commits: string, branch: string, gitlabData: RepoInfo) {
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
