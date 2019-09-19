import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import { ipcRenderer, shell } from 'electron';
import path from 'path';
import { Card, Icon, Row, Col, Button, Popconfirm, Tag } from 'antd';
import axios from 'axios';
import { useAsyncData } from '../../utils/hooks';
import { getProject } from '../../actions/project';
import routes from '../../constants/routes';
import './Project.css';

const Project = () => {
  const { isFetching, error, info } = useSelector(state => state.project);
  const dispatch = useDispatch();

  const openDialog = () => {
    ipcRenderer.send('open-project');
  };

  useEffect(() => {
    dispatch(getProject());
  }, []);

  useEffect(() => {
    ipcRenderer.on('selected-project', async (event, path) => {
      try {
        const resp = await axios.put(`http://localhost:5050/api/project/`, {
          path: path[0]
        });
        console.log(resp.data);
        dispatch(getProject());
      } catch (err) {
        console.log(err.response);
      }
    });
    return () => ipcRenderer.removeAllListeners(['selected-project']);
  }, []);

  if (error) return 'error';
  const { name, scenario, scenarios } = info;

  return (
    <div>
      <Card
        title={
          <React.Fragment>
            <h2>{name}</h2>
            <div className="cea-project-option-icons">
              <Icon type="plus" />
              <Icon type="folder-open" onClick={openDialog} />
              <Icon
                type="sync"
                onClick={() => {
                  dispatch(getProject());
                }}
                spin={isFetching}
              />
            </div>
          </React.Fragment>
        }
        bordered={false}
      >
        <Button type="primary" style={{ display: 'block', marginLeft: 'auto' }}>
          New Scenario
        </Button>
        {!scenarios.length ? (
          <div>No scenarios found</div>
        ) : scenario === '' ? (
          <div>No scenario currently selected</div>
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
    </div>
  );
};

// const NewProject

const ScenarioCard = ({ scenario, projectPath, current = false }) => {
  const [image, isLoading, error] = useAsyncData(
    `http://localhost:5050/api/project/scenario/${scenario}/image`
  );
  const dispatch = useDispatch();

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

  const changeScenario = async (goToEditor = false) => {
    try {
      const resp = await axios.put(`http://localhost:5050/api/project/`, {
        scenario
      });
      console.log(resp.data);
      await dispatch(getProject());
      goToEditor && dispatch(push(routes.INPUT_EDITOR));
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
      style={{ marginTop: 16 }}
      type="inner"
      actions={[
        <Popconfirm
          title="Are you sure delete this scenario?"
          onConfirm={deleteScenario}
          okText="Yes"
          cancelText="No"
          key="delete"
        >
          <Icon type="delete" />
        </Popconfirm>,
        <Icon type="edit" key="edit" />,
        <Icon type="folder" key="folder" onClick={openFolder} />,
        <Icon type="select" key="select" onClick={() => changeScenario()} />
      ]}
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
                onClick={() => changeScenario(true)}
              />
            )}
          </div>
        </Col>
      </Row>
    </Card>
  );
};

export default Project;
