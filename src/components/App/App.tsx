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
import JSZip from 'jszip';
import classNames from 'classnames';

export interface AppProps {}

export interface FileInfo {
  id: string;
  name: string;
  size: number;
}

const App: FC<AppProps> = memo(() => {
  const filesRef = useRef<{ [key: string]: File }>({});
  const requestFilesRef = useRef<{ [key: string]: boolean }>({});
  const compressedFilesRef = useRef<{ [key: string]: Blob }>({});

  const [files, setFiles] = useState<{ [key: string]: FileInfo }>({});
  const [progresses, setProgresses] = useState<{ [key: string]: number }>({});
  const [compressedSizes, setCompressedSizes] = useState<{
    [key: string]: number;
  }>({});

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const hasFiles = useMemo(() => {
    return Object.keys(files).length > 0;
  }, [files]);

  const isReadyToDownload = useMemo(() => {
    return Object.keys(files).every((it) => compressedSizes[it] !== undefined || errors[it] !== undefined);
  }, [files, errors, compressedSizes]);

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
    noClick: hasFiles,
  });

  useEffect(() => {
    const keys = Object.keys(files);

    const uploadFiles = keys
      .filter((it) => !requestFilesRef.current[it])
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
            setProgresses((prevState) => {
              return produce(prevState, (draft) => {
                draft[id] = progressEvent.progress || 0;
              });
            });
          },
        })
        .then((payload) => {
          if (payload.status === 200) {
            compressedFilesRef.current[id] = payload.data;
            setCompressedSizes((prevState) => {
              return produce(prevState, (draft) => {
                draft[id] = payload.data.size;
              });
            });
          }
        })
        .catch((error) => {
          setErrors((prevState) => {
            return produce(prevState, (draft) => {
              draft[id] = error.message || 'Unknown Error';
            });
          });
        });
    }
  }, [files]);

  const renderedFileItems = useMemo(() => {
    const keys = Object.keys(files);

    return keys.map((key) => {
      const it = files[key];
      return (
        <FileItem
          key={it.id}
          data={it}
          progress={progresses[key] || 0}
          compressedSize={compressedSizes[key] || null}
          error={errors[key] || null}
        />
      );
    });
  }, [files, progresses, compressedSizes]);

  const handleDownloadAll = useCallback(() => {
    if (!isReadyToDownload) {
      return;
    }

    const keys = Object.keys(compressedFilesRef.current);
    const fileNames = new Set<string>();
    const zip = new JSZip();

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const { name } = filesRef.current[key];

      const extname = name.split('.').pop();
      const basename = name.replace(`.${extname}`, '');

      let suffix = '';

      for (let j = 2; ; j++) {
        if (fileNames.has(`${basename}${suffix}.${extname}`)) {
          suffix = ` (${j})`;
        } else {
          break;
        }
      }

      const finalName = `${basename}${suffix}.${extname}`;

      fileNames.add(finalName);
      zip.file(finalName, compressedFilesRef.current[key]);
    }

    zip.generateAsync({ type: 'blob' }).then((content) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = 'tinified.zip';
      a.click();
    });
  }, [isReadyToDownload]);

  return (
    <div className={styles.app}>
      <div {...getRootProps({ className: styles.inner })}>
        <input {...getInputProps()} />
        {hasFiles ? (
          <div className={styles.upload}>
            <div className={styles.fileItems}>{renderedFileItems}</div>
            <div className={styles.actions}>
              <button
                type="button"
                className={classNames(styles.downloadAll, {
                  [styles.waiting]: !isReadyToDownload,
                })}
                onClick={handleDownloadAll}
              >
                {isReadyToDownload ? 'Download all' : 'Waiting...'}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.main}>
            <h1>
              Drop some files here, or click to select files to upload
            </h1>
            <p>
              Supported formats: JPEG, PNG
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

export default App;
