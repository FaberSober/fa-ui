export * from '@/components/antd-pro';
export * from '@/components/area-cascader';
export * from '@/components/auth';
export * from '@/components/base-cascader';
export * from '@/components/base-dict';
export * from '@/components/base-drag';
export * from '@/components/base-drawer';
export * from '@/components/base-editor';
export * from '@/components/base-entity-log';
export * from '@/components/base-field';
export * from '@/components/base-input';
export * from '@/components/base-layout';
export * from '@/components/base-modal';
export * from '@/components/base-search-select';
export * from '@/components/base-select';
export * from '@/components/base-title';
export * from '@/components/base-transfer';
export * from '@/components/base-tree';
export * from '@/components/base-tree-select';
export * from '@/components/container';
export * from '@/components/context';
export * from '@/components/decorator';
export * from '@/components/icons';

export { default as Button } from '@/components/Button';

export * from '@/hooks';
export * from '@/services';

export * from '@/types';
export * from '@/utils';

// 添加fontawesome icons图标
console.log('添加fontawesome icons图标');
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';

library.add(fas);
