import { Button } from 'react-figma-plugin-ds';

interface PublishProps {
  onReset: () => void;
}

export default function Publish({ onReset }: PublishProps) {
  return (
    <div className='flex'>
      <Button>Publish</Button>
      <Button isSecondary className='ml-4' onClick={onReset}>
        Reset Config
      </Button>
    </div>
  );
}
