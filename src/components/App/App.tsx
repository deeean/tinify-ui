import React, {
  FC,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styles from '~/components/App/App.module.scss';
import { v4 as uuidv4 } from 'uuid';
import { useDropzone } from 'react-dropzone';
import FileItem from '~/components/FileItem/FileItem';
import produce from 'immer';
import axios from 'axios';

export interface AppProps {}

export enum FileInfoStatus {
  Waiting,
  Uploading,
  Compressing,
  Finished,
}

export interface FileInfo {
  id: string;
  name: string;
  size: number;
}

const App: FC<AppProps> = memo(() => {
  const filesRef = useRef<{ [key: string]: File }>({});
  const requestFilesRef = useRef<{ [key: string]: boolean }>({});
  const compressedFilesRef = useRef<{ [key: string]: Blob }>({  });

  const [files, setFiles] = useState<{ [key: string]: FileInfo }>({});
  const [progresses, setProgresses] = useState<{ [key: string]: number }>({  });
  const [compressedSizes, setCompressedSizes] = useState<{ [key: string]: number }>({  });

  const onDrop = useCallback((files: Array<File>) => {
    const newFiles: { [key: string]: FileInfo } = {};

    for (let i = 0; i < files.length; i++) {
      const id = uuidv4();
      const it = files[i];

      filesRef.current[id] = it;
      newFiles[id] = {
        id,
        name: it.name,
        size: it.size,
      };
    }

    setFiles((prevState) => {
      return {
        ...prevState,
        ...newFiles,
      };
    });
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
    },
    noClick: true,
  });

  useEffect(() => {
    const keys = Object.keys(files);

    const uploadFiles = keys
      .filter(it => !requestFilesRef.current[it])
      .map((it) => {
      const info = files[it];

      return {
        id: info.id,
        data: filesRef.current[info.id],
      };
    });

    for (let i = 0; i < uploadFiles.length; i++) {
      const { id, data } = uploadFiles[i];

      const formData = new FormData();
      formData.append('image', data);
      requestFilesRef.current[id] = true;

      axios
        .post<Blob>('http://localhost:3000/compress', formData, {
          responseType: 'blob',
          onUploadProgress: (progressEvent) => {
            setProgresses(prevState => {
              return produce(prevState, (draft) => {
                draft[id] = progressEvent.progress || 0;
              });
            });
          },
        })
        .then((payload) => {
          if (payload.status === 200) {
            compressedFilesRef.current[id] = payload.data;
            setCompressedSizes(prevState => {
              return produce(prevState, draft => {
                draft[id] = payload.data.size;
              })
            })
          }
        });
    }
  }, [files]);

  const renderedFileItems = useMemo(() => {
    const keys = Object.keys(files);

    return keys.map((key) => {
      const it = files[key];
      return <FileItem key={it.id} data={it} progress={progresses[key] || 0} compressedSize={compressedSizes[key] || null} />;
    });
  }, [files, progresses, compressedSizes]);

  return (
    <div className={styles.app}>
      <div {...getRootProps({ className: styles.inner })}>
        <input {...getInputProps()} />
        <div className={styles.fileItems}>{renderedFileItems}</div>
      </div>
    </div>
  );
});

export default App;
