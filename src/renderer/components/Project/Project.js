import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import { Card, Button } from 'antd';
import { getProject } from '../../actions/project';
import axios from 'axios';
import NewProjectModal from './NewProjectModal';
import OpenProjectModal from './OpenProjectModal';
import NewScenarioModal from './NewScenarioModal';
import ScenarioCard from './ScenarioCard';
import routes from '../../constants/routes';
import './Project.css';

const Project = () => {
  const { isFetching, error, info } = useSelector((state) => state.project);
  const fetchProject = useFetchProject();

  const { name, path: projectPath, scenario, scenarios } = info;
  const projectExists = !error && name !== '';
  const projectTitle = projectExists ? name : 'No Project found';

  return (
    <div className="cea-project">
      <Card
        bordered={false}
        title={
          <div className="cea-project-title-bar">
            <h2>{projectTitle}</h2>
            <div className="cea-project-options">
              <NewProjectButton />
              <OpenProjectButton />
              <Button
                icon="sync"
                size="small"
                onClick={() => fetchProject(projectPath)}
                loading={isFetching}
              >
                Refresh
              </Button>
            </div>
          </div>
        }
      >
        {projectExists && (
          <React.Fragment>
            <NewScenarioButton project={info} />
            {!scenarios.length ? (
              <p style={{ textAlign: 'center', margin: 20 }}>
                No scenarios found
              </p>
            ) : scenario === null ? (
              <p style={{ textAlign: 'center', margin: 20 }}>
                No scenario currently selected
              </p>
            ) : null}
            {scenarios.map((_scenario) => (
              <ScenarioCard
                key={`${name}-${_scenario}`}
                scenario={_scenario}
                projectPath={projectPath}
                active={_scenario == scenario}
              />
            ))}
          </React.Fragment>
        )}
      </Card>
    </div>
  );
};

const NewProjectButton = ({ onSuccess }) => {
  const [isModalVisible, setModalVisible] = useState(false);

  return (
    <React.Fragment>
      <Button icon="plus" size="small" onClick={() => setModalVisible(true)}>
        Create Project
      </Button>
      <NewProjectModal
        visible={isModalVisible}
        setVisible={setModalVisible}
        onSuccess={onSuccess}
      />
    </React.Fragment>
  );
};

const OpenProjectButton = ({ onSuccess = () => {} }) => {
  const [isModalVisible, setModalVisible] = useState(false);

  return (
    <React.Fragment>
      <Button
        icon="folder-open"
        size="small"
        onClick={() => setModalVisible(true)}
      >
        Open Project
      </Button>
      <OpenProjectModal
        visible={isModalVisible}
        setVisible={setModalVisible}
        onSuccess={onSuccess}
      />
    </React.Fragment>
  );
};

const NewScenarioButton = ({ project = () => {} }) => {
  const [isModalVisible, setModalVisible] = useState(false);

  return (
    <React.Fragment>
      <Button
        type="primary"
        style={{
          display: 'block',
          width: '100%',
        }}
        onClick={() => setModalVisible(true)}
      >
        + Create New Scenario
      </Button>
      <NewScenarioModal
        visible={isModalVisible}
        setVisible={setModalVisible}
        project={project}
      />
    </React.Fragment>
  );
};

export const updateConfigProjectInfo = async (
  projectPath,
  scenario,
  onSuccess = () => {}
) => {
  try {
    const resp = await axios.put(`http://localhost:5050/api/project/`, {
      path: projectPath,
      scenario: scenario,
    });
    console.log(resp.data);
    onSuccess();
  } catch (err) {
    console.log(err.response);
  }
};

export const deleteScenario = async (scenario, onSuccess = () => {}) => {
  try {
    const resp = await axios.delete(
      `http://localhost:5050/api/project/scenario/${scenario}`
    );
    console.log(resp.data);
    onSuccess();
  } catch (err) {
    console.log(err.response);
  }
};

export const useOpenScenario = () => {
  const fetchProject = useFetchProject();
  const goToInputEditor = useChangeRoute(routes.INPUT_EDITOR);
  return (projectPath, scenario) => {
    updateConfigProjectInfo(projectPath, scenario, () => {
      // Fetch new project info first before going to input editor
      fetchProject().then(goToInputEditor);
    });
  };
};

export const useChangeRoute = (route) => {
  const dispatch = useDispatch();
  return () => dispatch(push(route));
};

export const useFetchProject = () => {
  const dispatch = useDispatch();
  return (projectPath = null) => dispatch(getProject(projectPath));
};

export const useConfigProjectInfo = () => {
  const [info, setInfo] = useState({
    name: null,
    path: null,
    scenario: null,
    scenarios: null,
  });

  const fetchInfo = async () => {
    try {
      const resp = await axios.get('http://localhost:5050/api/project/');
      setInfo(resp.data);
    } catch (error) {
      console.log(error);
    }
  };

  return { info, fetchInfo };
};

export default Project;
