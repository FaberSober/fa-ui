export * from '@/components';
export * from '@/hooks';
export * from '@/layout';
export * from '@/services';
export * from '@/types';
export * from '@/utils';

// 添加fontawesome icons图标
console.log('添加fontawesome icons图标');
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';

library.add(fas);
