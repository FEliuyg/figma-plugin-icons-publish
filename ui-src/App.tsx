import { useEffect, useRef, useState } from 'react';
import Publish from './Publish';
import Settings, { RepoInfo } from './Settings';
import { publishIcons } from './utils/publish';

export default function App() {
  const [mode, setMode] = useState<'edit' | 'publish'>('edit');
  const [repoInfo, setRepoInfo] = useState<RepoInfo>();
  const repoInfoRef = useRef(repoInfo);
  repoInfoRef.current = repoInfo;

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
        case 'getIconsSuccess': {
          publishIcons(repoInfoRef.current!, data.data);
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
        <Settings data={repoInfo} onOK={setRepoInfo} />
      )}
    </div>
  );
}
