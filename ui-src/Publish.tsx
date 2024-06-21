import { Button } from 'react-figma-plugin-ds';

interface PublishProps {
  onReset: () => void;
}

export default function Publish({ onReset }: PublishProps) {
  const handlePublish = () => {
    parent.postMessage({ pluginMessage: { type: 'getIcons' } }, '*');
  };

  return (
    <div className='flex'>
      <Button onClick={handlePublish}>Publish</Button>
      <Button isSecondary className='ml-4' onClick={onReset}>
        Reset Config
      </Button>
    </div>
  );
}
