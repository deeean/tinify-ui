import React, { FC, memo, useMemo } from 'react';
import styles from '~/components/FileItem/FileItem.module.scss';
import { FileInfo } from '~/components/App/App';
import { useSpring, animated, to } from '@react-spring/web';
import prettyBytes from 'pretty-bytes';
import classNames from 'classnames';

export interface FileItemProps {
  data: FileInfo;
  progress: number;
  compressedSize: number | null;
}

const FileItem: FC<FileItemProps> = memo(({ data: { name, size }, progress, compressedSize }) => {
  const progressSpring = useSpring({
    width: progress * 100,
    config: {
      tension: 600,
      friction: 70,
    }
  });

  const sizeDisplay = useMemo(() => {
    return prettyBytes(size, { space: false, });
  }, [size]);

  const percentDisplay = useMemo(() => {
    if (compressedSize === null) {
      return null;
    }

    return `${((1 - compressedSize / size) * 100 * -1).toFixed(1)}%`;
  }, [size, compressedSize]);

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

    if (progress === 1 && compressedSize === null) {
      return `Compressing`
    }

    if (progress !== 0 && compressedSize === null) {
      return `Uploading`
    }

    return 'Finished';
  }, [compressedSize, progress]);

  return (
    <div className={styles.fileItem}>
      <div className={styles.name}>{name}</div>
      <div className={styles.size}>{sizeDisplay}</div>
      <div className={styles.progress}>
        <div className={classNames(styles.progressStatus, styles.primary)}>
          {statusDisplay}
        </div>
        <animated.div
          className={styles.progressInner}
          style={{
            width: to(progressSpring.width, (x: number) => `${x}%`),
          }}
        >
          <div className={styles.progressStatus}>
            {statusDisplay}
          </div>
        </animated.div>
      </div>
      {compressedSizeDisplay && (
        <div className={styles.compressedSize}>
          {compressedSizeDisplay}
        </div>
      )}
      {percentDisplay && (
        <div className={styles.percent}>
          ({percentDisplay})
        </div>
      )}
    </div>
  );
});

export default FileItem;
