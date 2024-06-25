import { Octokit } from 'octokit';
import { RepoInfo } from '../Settings';
import { IconsProps } from './publish';
import { diffCache, generateCaches, getNextVersion } from './helper';

let octokit: any;
const headers = {
  'X-GitHub-Api-Version': '2022-11-28',
};

async function getMainBranch(githubData: RepoInfo) {
  const { owner, repo } = parseGithubUrl(githubData);
  const res = await octokit.request('GET /repos/{owner}/{repo}/branches/{branch}', {
    owner,
    repo,
    branch: githubData.branch,
    headers,
  });

  return res.data;
}

async function createBranch(githubData: RepoInfo, commitSha: string) {
  const { owner, repo } = parseGithubUrl(githubData);
  const ref = `refs/heads/figma-update-${Date.now()}`;
  const res = await octokit.request('POST /repos/{owner}/{repo}/git/refs', {
    owner,
    repo,
    ref,
    sha: commitSha,
    headers,
  });

  return res.data;
}

async function getContent(filePath: string, githubData: RepoInfo, branchName?: string) {
  const { owner, repo } = parseGithubUrl(githubData);

  const res = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
    owner: owner,
    repo: repo,
    path: filePath,
    headers,
  });

  return res.data;
}

interface CommitProps {
  mode: string;
  type: string;
  path: string;
  content?: string;
  sha?: string | null;
}

async function createCommits(
  content: CommitProps[],
  message: string,
  commitSha: string,
  githubData: RepoInfo,
  ref: string
) {
  const { owner, repo } = parseGithubUrl(githubData);
  const res = await octokit.request('POST /repos/{owner}/{repo}/git/trees', {
    owner: owner,
    repo: repo,
    base_tree: commitSha,
    tree: content,
  });

  const commitRes = await octokit.request('POST /repos/{owner}/{repo}/git/commits', {
    owner: owner,
    repo: repo,
    message: `[Figma]: ${message}`,
    tree: res.data.sha,
    parents: [commitSha],
  });

  await octokit.request('PATCH /repos/{owner}/{repo}/git/refs/{ref}', {
    owner: owner,
    repo: repo,
    ref: ref.replace('refs/', ''),
    sha: commitRes.data.sha,
    force: true,
    headers,
  });
}

async function createPullRequest(githubData: RepoInfo, body: string, sourceBranch: string) {
  const { owner, repo } = parseGithubUrl(githubData);

  const res = await octokit.request('POST /repos/{owner}/{repo}/pulls', {
    owner: owner,
    repo: repo,
    title: '[Figma]: update icons',
    body: body,
    head: sourceBranch,
    base: githubData.branch,
    headers,
  });

  return res.data;
}

async function mergePullRequest(githubData: RepoInfo, prNumber: number) {
  const { owner, repo } = parseGithubUrl(githubData);

  await octokit.request('PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge', {
    owner: owner,
    repo: repo,
    pull_number: prNumber,
    merge_method: 'rebase',
    headers,
  });
}

async function deleteBranch(githubData: RepoInfo, ref: string) {
  const { owner, repo } = parseGithubUrl(githubData);

  await octokit.request('DELETE /repos/{owner}/{repo}/git/refs/{ref}', {
    owner: owner,
    repo: repo,
    ref: ref.replace('refs/', ''),
    headers,
  });
}

export async function githubPublish(githubData: RepoInfo, icons: IconsProps[]) {
  octokit = new Octokit({
    auth: githubData.token,
  });

  // 0. generate icons cache
  // 1. create a new branch
  // 2. get content of package.json
  // 3. get content of cache.json
  // 4. diff cache.json
  // 5. create a commit
  // 6. create a merge request
  // 7. accept merge request to be merged
  const branchInfo = await getMainBranch(githubData);
  const { ref: newRef, object } = await createBranch(githubData, branchInfo.commit.sha);
  const res = await getContent('package.json', githubData);
  const packageJson = getJsonFile(res);
  packageJson.version = getNextVersion(packageJson.version);

  let preCaches = null;
  try {
    const cacheRes = await getContent('cache.json', githubData);
    preCaches = getJsonFile(cacheRes);
  } catch (error) {}
  const newCaches = generateCaches(icons);
  const diffResult = diffCache(newCaches, preCaches);

  if (diffResult.length === 0) {
    throw Error('There is nothing to update');
  }

  const commits: CommitProps[] = [
    {
      mode: '100644',
      type: 'blob',
      path: 'package.json',
      content: JSON.stringify(packageJson, null, 2),
    },
    {
      mode: '100644',
      type: 'blob',
      path: 'cache.json',
      content: JSON.stringify(newCaches, null, 2),
    },
    ...diffResult.map((d) => {
      const icon = icons.find((icon) => icon.id === d.id);
      return {
        mode: '100644',
        type: 'blob',
        path: `src/svg/${d.componentName}.svg`,
        content: d.action === 'delete' ? undefined : new TextDecoder().decode(icon?.content),
        sha: d.action === 'delete' ? null : undefined,
      };
    }),
  ];

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

  await createCommits(commits, message, object.sha, githubData, newRef);

  const { number } = await createPullRequest(
    githubData,
    message,
    newRef.replace('refs/heads/', '')
  );
  await mergePullRequest(githubData, number);

  await deleteBranch(githubData, newRef);
}

function getJsonFile(res: any) {
  if (res?.encoding === 'base64') {
    return JSON.parse(atob(res.content));
  } else {
    return null;
  }
}

function parseGithubUrl(githubData: RepoInfo) {
  const [owner, repo] = githubData.url.replace('https://github.com/', '').split('/');
  return {
    owner,
    repo,
  };
}
