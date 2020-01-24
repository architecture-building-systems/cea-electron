import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import { Button, Icon } from 'antd';
import axios from 'axios';
import { remote } from 'electron';
import getStatic from '../../utils/static';
import NewProjectModal from '../Project/NewProjectModal';
import OpenProjectModal from '../Project/OpenProjectModal';
import routes from '../../constants/routes';

const logo = getStatic('cea-logo.png');
const ceaVersion = remote.getGlobal('ceaVersion');

const useProjectInfo = initialValue => {
  const [info, setInfo] = useState(initialValue);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const resp = await axios.get('http://localhost:5050/api/project/');
        setInfo(resp.data);
      } catch (error) {
        console.log(error);
      }
    };
    fetchInfo();
  }, []);

  return info;
};

const Landing = () => {
  const [visibleNew, setNewVisible] = useState(false);
  const [visibleOpen, setOpenVisible] = useState(false);
  const dispatch = useDispatch();

  const { path: projectPath } = useProjectInfo({ path: null });

  const goToProjectPage = async () => {
    dispatch(push(routes.PROJECT_OVERVIEW));
  };

  return (
    <React.Fragment>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <img
          src={logo}
          style={{ width: '15%', minWidth: 100, margin: 30 }}
          alt="CEA Logo"
        />
        <h2 style={{ fontSize: '2em' }}>City Energy Analyst</h2>
        {ceaVersion ? <h3>{`Version ${ceaVersion}`}</h3> : null}
        <Button
          type="primary"
          style={{ width: 300, margin: 24 }}
          onClick={() => setNewVisible(true)}
        >
          <Icon type="plus" />
          New Project
        </Button>
        <Button
          type="primary"
          style={{ width: 300, margin: 24 }}
          onClick={() => setOpenVisible(true)}
        >
          <Icon type="folder-open" />
          Open Project
        </Button>
      </div>
      <NewProjectModal
        visible={visibleNew}
        setVisible={setNewVisible}
        initialValue={
          projectPath
            ? require('path').dirname(projectPath)
            : remote.app.getPath('home')
        }
        onSuccess={goToProjectPage}
      />
      <OpenProjectModal
        visible={visibleOpen}
        setVisible={setOpenVisible}
        initialValue={projectPath}
        onSuccess={goToProjectPage}
      />
    </React.Fragment>
  );
};

export default Landing;
