import { useEffect, useState } from 'react';
import Publish from './Publish';
import Settings, { RepoInfo } from './Settings';

export default function App() {
  const [mode, setMode] = useState<'edit' | 'publish'>('edit');
  const [repoInfo, setRepoInfo] = useState<RepoInfo>();

  useEffect(() => {
    // initialize to get settings info
    parent.postMessage({ pluginMessage: { type: 'getData' } }, '*');

    // listen for messages from the parent window
    window.onmessage = async (e) => {
      const data = e.data.pluginMessage;

      switch (data.type) {
        case 'getDataSuccess': {
          setRepoInfo(data.data);
          setMode('publish');
          break;
        }
        case 'saveDataSuccess': {
          setMode('publish');
          break;
        }
      }
    };
  }, []);

  return (
    <div className='p-5'>
      {mode === 'publish' ? (
        <Publish onReset={() => setMode('edit')} />
      ) : (
        <Settings data={repoInfo} />
      )}
    </div>
  );
}
