import React, { FC, memo, useMemo } from 'react';
import styles from '~/components/FileItem/FileItem.module.scss';
import { FileInfo } from '~/components/App/App';
import { useSpring, animated, to } from '@react-spring/web';
import prettyBytes from 'pretty-bytes';

export interface FileItemProps {
  data: FileInfo;
  progress: number;
  compressedSize: number | null;
}

const FileItem: FC<FileItemProps> = memo(({ data: { name, size }, progress, compressedSize }) => {
  const progressSpring = useSpring({
    width: progress * 100,
  });

  const sizeDisplay = useMemo(() => {
    return prettyBytes(size, { space: false, });
  }, [size]);

  const compressedSizeDisplay = useMemo(() => {
    if (compressedSize === null) {
      return null;
    }

    return prettyBytes(compressedSize, { space: false, });
  }, [compressedSize]);

  const statusDisplay = useMemo(() => {
    if (progress === 0 && compressedSize === null) {
      return `Waiting`;
    }

    if (progress !== 0 && compressedSize === null) {
      return `Uploading`
    }

    if (compressedSize === null) {
      return `Compressing`
    }

    return 'Finished';
  }, [compressedSize, progress]);

  return (
    <div className={styles.fileItem}>
      <div className={styles.name}>{name}</div>
      <div className={styles.size}>{sizeDisplay}</div>
      <div className={styles.progress}>
        <animated.div
          className={styles.progressInner}
          style={{
            width: to(progressSpring.width, (x: number) => `${x}%`),
          }}
        />
        <div className={styles.progressStatus}>
          {statusDisplay}
        </div>
        <div className={styles.progressStatus}>
          {statusDisplay}
        </div>
      </div>
      {compressedSizeDisplay && (
        <div className={styles.compressedSize}>
          {compressedSizeDisplay}
        </div>
      )}
    </div>
  );
});

export default FileItem;
