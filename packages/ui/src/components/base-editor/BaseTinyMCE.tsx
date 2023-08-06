import React, {CSSProperties, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState} from 'react';
import { Editor } from '@tinymce/tinymce-react';
import {isNil, trim} from 'lodash';
import { fileSaveApi } from '@ui/services/base';
import {useHeight} from '@ui/hooks';
import {ThemeLayoutContext} from "@ui/layout";
import {Spin} from "antd";


export interface BaseTinyMCEProps {
  initialValue?: string | undefined;
  value?: string | undefined;
  onChange?: (v: string) => void;
  onSave?: (v: string) => void;
  onReady?: () => void;
  style?: CSSProperties;
  editorInit?: any;
  editorProps?: any;
  loading?: boolean;
}

/**
 * TinyMCE编辑器
 * @author xu.pengfei
 * @date 2022/2/17 14:17
 */
function BaseTinyMCE({ initialValue, value, onChange, onSave, onReady, style, editorInit, editorProps, loading }: BaseTinyMCEProps, ref: any) {
  const {themeDark} = useContext(ThemeLayoutContext)
  const editorRef = useRef<any>(null);

  const [flash, setFlash] = useState(false)

  // 主题变换后，重构编辑器
  useEffect(() => {
    if (!ready) return;
    setFlash(true)
    setTimeout(() => {
      setFlash(false)
    }, 100)
  }, [themeDark])

  const divRef = useRef<any | null>();
  const height = useHeight(divRef);
  const [ready, setReady] = useState(false);
  const [innerValue, setInnerValue] = useState(value);

  useImperativeHandle(ref, () => ({
    getContent: () => {
      if (editorRef.current) {
        return editorRef.current.getContent();
      }
      return '';
    },
    setContent: (html: string) => {
      if (editorRef.current) {
        // console.log('setContent', html, editorRef.current)
        editorRef.current.setContent(trim(html));
      }
    },
    save: () => editorRef.current?.execCommand('mceSave'),
  }));

  useEffect(() => {
    if (!ready) return;
    if (value !== innerValue) {
      if (editorRef.current) {
        console.log('update innerValue from props.value = ', value);
        setInnerValue(value);
        editorRef.current.setContent(trim(value));
      }
    }
  }, [value, ready]);

  useEffect(() => {
    if (isNil(editorRef.current)) return;
    // FIXME 目前切换主题，编辑器也需要跟随主题进行切换
  }, [themeDark])

  const editor = useMemo(() => {
    console.log('useMemo.editor', height, 'themeDark', themeDark)
    if (height === undefined) return null;
    if (flash) return null;
    return (
      <Editor
        apiKey="xxx"
        style={{ margin: -10, padding: 10 }}
        tinymceScriptSrc="/plugins/tinymce/v6.2.0/tinymce.min.js"
        onInit={(_, editor) => {
          console.log('BaseTinyMCE#onInit')
          editorRef.current = editor;
          setReady(true)
          if (onReady) onReady();
        }}
        initialValue={initialValue}
        init={{
          height,
          menubar: false,
          language: 'zh-Hans',
          plugins: [
            'advlist',
            'autolink',
            'lists',
            'link',
            'image',
            'charmap',
            'preview',
            'anchor',
            'searchreplace',
            'visualblocks',
            'codesample',
            'code',
            'fullscreen',
            'insertdatetime',
            'media',
            'table',
            'code',
            'help',
            'wordcount',
            'emoticons',
            'paste',
            'save'
          ],
          toolbar: 'blocks bold italic forecolor bullist numlist table link image media charmap emoticons codesample code fullscreen help',
          content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px; } ' + ' img {max-width: 100%;} ',
          skin: themeDark ? "oxide-dark" : "oxide",
          content_css: themeDark ? "dark" : "default",
          // 代码片段-语言类型
          codesample_languages: [
            { text: 'Bash', value: 'bash' },
            { text: 'HTML/XML', value: 'markup' },
            { text: 'JavaScript', value: 'javascript' },
            { text: 'TypeScript', value: 'typeScript' },
            { text: 'React', value: 'jsx' },
            { text: 'CSS', value: 'css' },
            { text: 'PHP', value: 'php' },
            { text: 'Ruby', value: 'ruby' },
            { text: 'Python', value: 'python' },
            { text: 'Java', value: 'java' },
            { text: 'SQL', value: 'sql' },
            { text: 'C', value: 'c' },
            { text: 'C#', value: 'csharp' },
            { text: 'C++', value: 'cpp' },
            { text: 'yaml', value: 'yaml' },
            { text: 'properties', value: 'properties' },
          ],
          /**
           * 需要在后台提供对应API的接口，参考：https://www.tiny.cloud/docs/advanced/php-upload-handler/
           * 返回数据json格式为：{ location : '/your/uploaded/image/file'}
           */
          // images_upload_url: SITE_INFO.TINYMCE_FILE_UPLOAD_API,
          images_upload_handler: (blobInfo, progress) =>
            new Promise((resolve) => {
              const formData = new FormData();
              formData.append('file', blobInfo.blob(), blobInfo.filename());
              fileSaveApi
                .uploadFileForm(formData, (pe) => progress((pe.loaded / pe.total) * 100))
                .then((res) => {
                  resolve(fileSaveApi.genLocalGetFile(res.data.id));
                });
            }),
          /* enable title field in the Image dialog*/
          image_title: true,
          /* enable automatic uploads of images represented by blob or data URIs*/
          automatic_uploads: true,
          paste_data_images: true,
          // 粘贴图片后，自动上传
          urlconverter_callback: function(url, node, on_save, name) {
            if (node === 'img' && name === 'src') {
              // 判断是否是本服务器的图片
              const isInner = url.indexOf("data:image/gif;base64") > -1 || url.indexOf("blob:") > -1 || url.indexOf("/api/base/admin/fileSave/getFile/") > -1;

              if (!isInner) {
                console.log('urlconverter_callback 识别到外部图片URL', url, node, on_save, name);

                fileSaveApi.uploadFromUrl({url}).then(res => {
                  const localFileUrl = fileSaveApi.genLocalGetFile(res.data.id);

                  let content = editorRef.current.getContent();
                  content = content.replace(url, localFileUrl);
                  editorRef.current.setContent(content);
                  if (onChange) {
                    onChange(content)
                  }
                })
              }
            }
            return url;
          },
          /*
            URL of our upload handler (for more details check: https://www.tiny.cloud/docs/configure/file-image-upload/#images_upload_url)
            images_upload_url: 'postAcceptor.php',
            here we add custom filepicker only to Image dialog
          */
          file_picker_types: 'image',
          relative_urls: false,
          /* and here's our custom image picker*/
          file_picker_callback: (cb) => {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/*,video/*');

            input.addEventListener('change', (e: any) => {
              const file = e.target.files[0];

              const reader = new FileReader();
              reader.addEventListener('load', () => {
                // 走自己服务器上传，会占据自己服务器带宽
                fileSaveApi.uploadFile(file).then((res) => {
                  cb(fileSaveApi.genLocalGetFile(res.data.id), { title: file.name });
                });

                // 走七牛云服务器上传，节省自己服务器带宽
                // fetchUploadImgQiniu(
                //   file,
                //   'editor/image',
                //   file.name,
                //   (path, res) => {
                //     /* call the callback and populate the Title field with the file name */
                //     cb(path, { title: file.name });
                //   },
                //   (res) => {
                //     const { percent } = res.total;
                //   },
                //   (res) => {
                //     // onError(new Error(res), file);
                //   }
                // );
              });
              reader.readAsDataURL(file);
            });

            input.click();
          },
          // https://www.tiny.cloud/docs/tinymce/6/save/#save_onsavecallback
          // CTRL+S 快捷键保存
          save_onsavecallback: () => {
            // console.log('Saved');
            if (onSave) {
              onSave(editorRef.current.getContent())
            }
          },
          ...editorInit,
        }}
        // onBeforeSetContent={(e) => console.log('onBeforeSetContent', e)}
        // onNodeChange={(e) => console.log('onNodeChange', e)}
        // onSelectionChange={(e) => console.log('onSelectionChange', e)}
        onFocus={() => {
          // console.log('onFocus', editorRef.current.getContent())
        }}
        // onBlur={(e) => {
        //   // console.log('onBlur', e, editorRef.current.getContent())
        //   if (onChange) {
        //     onChange(editorRef.current.getContent())
        //   }
        // }}
        onChange={() => {
          // console.log('onChange', e, editorRef.current.getContent())
          setInnerValue(editorRef.current.getContent());
          if (onChange) {
            onChange(editorRef.current.getContent());
          }
        }}
        {...editorProps}
      />
    );
  }, [height, flash]);

  return (
    <div ref={divRef} style={{ width: '100%', height: '100%', position: 'relative', ...style }}>
      {editor}
      {loading && <div className="fa-full-content fa-flex-center"><Spin size="large" /></div>}
    </div>
  );
}

export default React.forwardRef(BaseTinyMCE);
