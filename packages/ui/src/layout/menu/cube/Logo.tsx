import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { UserLayoutContext } from '@/layout';
import { fileSaveApi } from '@/services';


/**
 * @author xu.pengfei
 * @date 2022/9/23
 */
export default function Logo() {
  const { systemConfig } = useContext(UserLayoutContext);
  return (
    <Link to="/admin" className="fa-menu-logo">
      <img src={fileSaveApi.genLocalGetFile(systemConfig.logo)} alt="logo" className="fa-menu-logo-img" />
      <span className="fa-menu-logo-title">{systemConfig.title}</span>
    </Link>
  );
}
