import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import { ipcRenderer, shell } from 'electron';
import path from 'path';
import {
  Card,
  Icon,
  Row,
  Col,
  Button,
  Popconfirm,
  Tag,
  Dropdown,
  Menu
} from 'antd';
import axios from 'axios';
import { useAsyncData } from '../../utils/hooks';
import { getProject } from '../../actions/project';
import routes from '../../constants/routes';
import NewProjectModal from './NewProjectModal';
import NewScenarioModal from './NewScenarioModal';
import RenameScenarioModal from './RenameScenarioModal';
import './Project.css';

const Project = () => {
  const { isFetching, error, info } = useSelector(state => state.project);
  const [isProjectModalVisible, setProjectModalVisible] = useState(false);
  const [isScenarioModalVisible, setScenarioModalVisible] = useState(false);
  const dispatch = useDispatch();

  const reloadProject = () => {
    dispatch(getProject());
  };

  // Get Project Details on mount
  useEffect(() => {
    reloadProject();
  }, []);

  // Setup ipcRenderer listener for open project
  useEffect(() => {
    ipcRenderer.on('selected-project', async (event, _path) => {
      if (info.path !== _path) {
        try {
          const resp = await axios.put(`http://localhost:5050/api/project/`, {
            path: _path
          });
          console.log(resp.data);
          reloadProject();
        } catch (err) {
          console.log(err.response);
        }
      }
    });
    return () => ipcRenderer.removeAllListeners(['selected-project']);
  }, []);

  const { name, scenario, scenarios } = info;

  return (
    <div>
      <Card
        title={
          <React.Fragment>
            <h2>{error || name === '' ? 'No Project found' : name}</h2>
            <div className="cea-project-option-icons">
              <Icon type="plus" onClick={() => setProjectModalVisible(true)} />
              <Icon
                type="folder-open"
                onClick={() => ipcRenderer.send('open-project')}
              />
              <Icon type="sync" onClick={reloadProject} spin={isFetching} />
            </div>
          </React.Fragment>
        }
        bordered={false}
      >
        <Button
          type="primary"
          style={{
            display: 'block',
            width: '100%'
          }}
          onClick={() => setScenarioModalVisible(true)}
        >
          + Create New Scenario
        </Button>
        {!scenarios.length ? (
          <p style={{ textAlign: 'center', margin: 20 }}>No scenarios found</p>
        ) : scenario === '' ? (
          <p style={{ textAlign: 'center', margin: 20 }}>
            No scenario currently selected
          </p>
        ) : (
          <ScenarioCard
            scenario={scenario}
            projectPath={info.path}
            current={true}
          />
        )}
        {scenarios.map(_scenario =>
          _scenario !== scenario ? (
            <ScenarioCard
              key={`${name}-${_scenario}`}
              scenario={_scenario}
              projectPath={info.path}
            />
          ) : null
        )}
      </Card>
      <NewProjectModal
        visible={isProjectModalVisible}
        setVisible={setProjectModalVisible}
        project={info}
      />
      <NewScenarioModal
        visible={isScenarioModalVisible}
        setVisible={setScenarioModalVisible}
        project={info}
      />
    </div>
  );
};

const ScenarioCard = ({ scenario, projectPath, current = false }) => {
  const [image, isLoading, error] = useAsyncData(
    `http://localhost:5050/api/project/scenario/${scenario}/image`,
    { image: null },
    [scenario]
  );
  const [isRenameModalVisible, setRenameModalVisible] = useState(false);
  const dispatch = useDispatch();

  const editMenu = (
    <Menu>
      <Menu.Item key="rename" onClick={() => setRenameModalVisible(true)}>
        Rename
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="delete">Delete</Menu.Item>
    </Menu>
  );

  const deleteScenario = async () => {
    try {
      const resp = await axios.delete(
        `http://localhost:5050/api/project/scenario/${scenario}`
      );
      console.log(resp.data);
      dispatch(getProject());
    } catch (err) {
      console.log(err.response);
    }
  };

  const changeScenario = async () => {
    try {
      const resp = await axios.put(`http://localhost:5050/api/project/`, {
        scenario
      });
      console.log(resp.data);
      await dispatch(getProject());
      dispatch(push(routes.INPUT_EDITOR));
    } catch (err) {
      console.log(err.response);
    }
  };

  const openFolder = () => {
    shell.openItem(path.join(projectPath, scenario));
  };

  return (
    <Card
      title={
        <React.Fragment>
          <span>{scenario} </span>
          {current ? <Tag>Current</Tag> : null}
        </React.Fragment>
      }
      extra={
        <React.Fragment>
          <span id={`${scenario}-edit-button`} className="scenario-edit-button">
            <Dropdown
              overlay={editMenu}
              trigger={['click']}
              getPopupContainer={() => {
                return document.getElementById(`${scenario}-edit-button`);
              }}
            >
              <Button>
                Edit <Icon type="down" />
              </Button>
            </Dropdown>
          </span>
          {current ? null : (
            <Button type="primary" onClick={changeScenario}>
              Open
            </Button>
          )}
        </React.Fragment>
      }
      style={{ marginTop: 16 }}
      type="inner"
    >
      <Row>
        <Col span={6}>
          <div
            style={{
              width: 256,
              height: 160,
              backgroundColor: '#eee',
              textAlign: 'center',
              textJustify: 'center'
            }}
          >
            {isLoading ? null : error ? (
              'Unable to generate image'
            ) : (
              <img
                className="cea-scenario-preview-image"
                src={`data:image/png;base64,${image.image}`}
                onClick={changeScenario}
              />
            )}
          </div>
        </Col>
      </Row>
      <RenameScenarioModal
        scenario={scenario}
        projectPath={projectPath}
        visible={isRenameModalVisible}
        setVisible={setRenameModalVisible}
      />
    </Card>
  );
};

export default Project;
