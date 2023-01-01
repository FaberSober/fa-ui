import UploadFileLocal, {UploadFileLocalProps} from './UploadFileLocal';
import UploadFileLocalMultiple, {UploadFileLocalMultipleProps} from './UploadFileLocalMultiple';
import UploadFileQiniu, {UploadFileQiniuProps} from './UploadFileQiniu';
import UploadImgLocal, {UploadImgLocalProps} from './UploadImgLocal';
import UploadImgQiniu, {UploadImgQiniuProps} from './UploadImgQiniu';
import { fetchUploadImgQiniu } from './utils';

export {
  fetchUploadImgQiniu,
  UploadImgLocal,
  UploadFileLocal,
  UploadFileQiniu,
  UploadImgQiniu,
  UploadFileLocalMultiple,
};

export type { UploadFileLocalProps, UploadFileLocalMultipleProps, UploadFileQiniuProps, UploadImgLocalProps, UploadImgQiniuProps }
