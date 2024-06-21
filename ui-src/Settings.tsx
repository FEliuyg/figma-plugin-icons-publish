import { useState } from 'react';
import { Button, Label, Select, SelectProps, Input } from 'react-figma-plugin-ds';

const repoOptions: SelectProps['options'] = [
  {
    label: 'GitHub',
    value: 'github',
  },
  {
    label: 'GitLab',
    value: 'gitlab',
  },
];

export interface RepoInfo {
  type: 'github' | 'gitlab';
  url: string;
  token: string;
  projectId: string;
}

interface SettingsProps {
  data?: RepoInfo;
}

export default function Settings({ data }: SettingsProps) {
  const [repoInfo, setRepoInfo] = useState<RepoInfo>(
    data ?? {
      type: 'gitlab',
      url: '',
      token: '',
      projectId: '',
    }
  );

  const handleValueChange = (key: string) => (value: string) => {
    setRepoInfo((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (repoInfo.type && repoInfo.url && repoInfo.token && repoInfo.projectId) {
      parent.postMessage({ pluginMessage: { type: 'saveData', data: repoInfo } }, '*');
    } else {
      // 提示用户输入完整信息
      parent.postMessage(
        { pluginMessage: { type: 'notify', data: 'Please enter all required information.' } },
        '*'
      );
    }
  };

  return (
    <div>
      {/* <div>
        <Label className='text-black'>
          <span className='text-red-500'>*</span>Repo Type:
        </Label>
        <Select
          placeholder='select repo type'
          options={repoOptions}
          defaultValue={repoInfo.type}
          onChange={(option) => {
            handleValueChange('type')(option.value as RepoInfo['type']);
          }}
        />
      </div> */}

      <div>
        <Label className='text-black'>
          <span className='text-red-500'>*</span>Repo URL:
        </Label>
        <Input
          defaultValue={repoInfo.url}
          placeholder='please enter repo url'
          onChange={(value) => {
            handleValueChange('url')(value);
          }}
        />
      </div>

      <div>
        <Label className='text-black'>
          <span className='text-red-500'>*</span>Project ID:
        </Label>
        <Input
          defaultValue={repoInfo.projectId}
          placeholder='please enter repo project id'
          onChange={(value) => {
            handleValueChange('projectId')(value);
          }}
        />
      </div>

      <div className='mb-4'>
        <Label className='text-black'>
          <span className='text-red-500'>*</span>Token:
        </Label>
        <Input
          defaultValue={repoInfo.token}
          placeholder='please enter token'
          onChange={(value) => {
            handleValueChange('token')(value);
          }}
        />
      </div>

      <Button onClick={handleSave}>Save</Button>
    </div>
  );
}
