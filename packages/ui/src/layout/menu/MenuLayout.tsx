import React, { ReactNode, useEffect, useState } from 'react';
import { Empty, Layout } from 'antd';
import { find, isNil } from 'lodash';
import { useLocation, useNavigate } from 'react-router-dom';
import { Fa, FaEnums, Rbac } from '@/types';
import { findTreePath, flatTreeList } from '@/utils';
import { rbacUserRoleApi } from '@/services';
import MenuLayoutContext, { MenuLayoutContextProps } from './context/MenuLayoutContext';
import Logo from './cube/Logo';
import MenuAppHorizontal from './cube/MenuAppHorizontal';
import SideMenu from './cube/SideMenu';
import OpenTabs from './cube/OpenTabs';
import { useLocalStorage } from 'react-use';
import { FaUiContext, FaUiContextProps } from "@/components/context";
import { FaFlexRestLayout } from "@/components/base-layout";
import './MenuLayout.css';


export interface MenuLayoutProps extends Fa.BaseChildProps{
  rightDom?: ReactNode;
}

/**
 * @author xu.pengfei
 * @date 2022/9/22 22:23
 */
export default function MenuLayout({ rightDom, children }: MenuLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // 将tree平铺的menu list
  const [menuList, setMenuList] = useState<Rbac.RbacMenu[]>([]);
  // 完整的menu tree
  const [menuFullTree, setMenuFullTree] = useState<Fa.TreeNode<Rbac.RbacMenu>[]>([]);
  // 当前选中block下的menu tree
  const [menuTree, setMenuTree] = useState<Fa.TreeNode<Rbac.RbacMenu>[]>([]);

  const [menuSelAppId, setMenuSelAppId] = useState<string>(); // 当前选中顶部模块blockId
  const [menuSelMenuId, setMenuSelMenuId] = useState<string>(); // 当前选中的左侧菜单menu id
  const [menuSelPath, setMenuSelPath] = useState<string[]>([]); // 当前选中的菜单ID数组（不包含顶部block菜单）
  const [collapse, setCollapse] = useLocalStorage<boolean>('MenuLayout.collapse', false); // 是否折叠左侧菜单
  const [openSideMenuKeys, setOpenSideMenuKeys] = useState<string[]>([]); // 受控-左侧菜单打开的menu id数组
  const [openTabs, setOpenTabs] = useState<Rbac.RbacMenu[]>([]); // 受控-打开的标签页数组

  useEffect(() => {
    rbacUserRoleApi.getMyMenusTree().then((res) => {
      setMenuFullTree(res.data);
      const menuArr = flatTreeList(res.data);
      setMenuList(menuArr);

      // 初始化选中的菜单
      let menu = find(menuArr, (i) => i.linkUrl === location.pathname) as Rbac.RbacMenu;
      if (menu === undefined) {
        menu = menuArr[0];
      }
      syncOpenMenuById(menu.id, res.data);
    });
  }, []);

  useEffect(() => {
    syncOpenMenuById(menuSelMenuId, menuFullTree);
  }, [collapse]);

  /**
   * 同步打开的菜单到页面布局
   * @param openMenuId
   * @param tree
   */
  function syncOpenMenuById(openMenuId: string | undefined, tree: Fa.TreeNode<Rbac.RbacMenu>[]) {
    if (openMenuId === undefined) return;

    const menuArr = flatTreeList(tree);
    const menu = find(menuArr, (i) => i.id === openMenuId) as Rbac.RbacMenu;

    setMenuSelMenuId(openMenuId);
    // 打开页面
    navigate(menu.linkUrl);

    const menuPath = findTreePath(tree, (menu) => menu.sourceData.id === openMenuId);
    const [id0, ...restIds] = menuPath;

    // 顶部模块同步打开位置
    const blocks = tree.filter((i) => i.sourceData.level === FaEnums.RbacMenuLevelEnum.APP);
    const blockFind = find(blocks, (i) => i.id === id0.id);
    if (blockFind) {
      setMenuSelAppId(blockFind.id);
      setMenuTree(blockFind.children || []);
    } else {
      setMenuTree([]);
    }

    // sider同步打开位置
    const menuIds = restIds.map((i) => i.id);
    setMenuSelPath(menuIds);
    setOpenSideMenuKeys(collapse ? [] : menuIds);

    // 加入已经打开的tabs
    const tab = find(openTabs, (i) => i.id === menu.id);
    if (isNil(tab)) {
      setOpenTabs([...openTabs, menu]);
    }
  }

  const contextValue: MenuLayoutContextProps = {
    menuFullTree,
    menuList,
    menuTree,
    menuSelAppId,
    menuSelPath,
    menuSelMenuId,
    setMenuSelMenuId: (id) => syncOpenMenuById(id, menuFullTree),
    setMenuSelPath: (key: string) => {
      syncOpenMenuById(key, menuFullTree);
    },
    setMenuSelAppId: (id) => {
      setMenuSelAppId(id);
      const selTree = find(menuFullTree, (i) => i.sourceData.id === id);
      setMenuTree(selTree && selTree.children ? selTree.children : []);
      setMenuSelPath([]);
    },
    collapse,
    setCollapse: setCollapse,
    openSideMenuKeys,
    setOpenSideMenuKeys,
    openTabs,
    setOpenTabs,
  };

  const faUiContextValue: FaUiContextProps = {
    permissions: menuList.map((m) => m.linkUrl),
  };

  const hasRoutePermission = true; // TODO 判断是否有路由权限
  const width = collapse ? 'calc(100% - 44px)' : 'calc(100% - 200px)';
  return (
    <MenuLayoutContext.Provider value={contextValue}>
      <FaUiContext.Provider value={faUiContextValue}>
        <Layout style={{ height: '100vh', width: '100vw' }}>
          <Layout.Header className="fa-menu-header">
            <Logo />
            <MenuAppHorizontal />
            {rightDom}
          </Layout.Header>

          <Layout style={{ flexDirection: 'row' }}>
            <SideMenu />

            <Layout style={{ width }}>
              {hasRoutePermission ? (
                <div className="fa-full fa-flex-column">
                  <div className="fa-menu-open-tabs">
                    <OpenTabs />
                  </div>
                  <FaFlexRestLayout>
                    <div className="fa-main">{children}</div>
                  </FaFlexRestLayout>
                </div>
              ) : (
                <Empty description="403" />
              )}
            </Layout>
          </Layout>
        </Layout>
      </FaUiContext.Provider>
    </MenuLayoutContext.Provider>
  );
}
