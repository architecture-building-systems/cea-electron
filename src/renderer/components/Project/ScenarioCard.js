import React, { useState, useEffect } from 'react';
import { Card, Icon, Row, Col, Button, Modal, Tag, Dropdown, Menu } from 'antd';
import axios from 'axios';
import { deleteScenario, useOpenScenario, useFetchProject } from './Project';
import RenameScenarioModal from './RenameScenarioModal';

const ScenarioCard = ({ scenario, projectPath, active }) => {
  const _openScenario = useOpenScenario();
  const openScenario = () => _openScenario(scenario);

  return (
    <Card
      style={{ marginTop: 16 }}
      type="inner"
      title={
        <React.Fragment>
          <span>{scenario} </span>
          {active && <Tag>Current</Tag>}
        </React.Fragment>
      }
      extra={
        <React.Fragment>
          <EditScenarioMenu scenario={scenario} projectPath={projectPath} />
          <Button type="primary" onClick={openScenario}>
            Open
          </Button>
        </React.Fragment>
      }
    >
      <Row>
        <Col span={6}>
          <ScenarioImage
            projectPath={projectPath}
            scenario={scenario}
            onClick={openScenario}
          />
        </Col>
      </Row>
    </Card>
  );
};

const ScenarioImage = ({ projectPath, scenario, onClick = () => {} }) => {
  const [image, isLoading, error] = useGenerateScenarioImage(
    projectPath,
    scenario
  );

  return (
    <div
      style={{
        width: 256,
        height: 160,
        backgroundColor: '#eee',
        textAlign: 'center',
        textJustify: 'center',
      }}
    >
      {isLoading ? (
        'Fetching image...'
      ) : error ? (
        'Unable to generate image'
      ) : (
        <img
          className="cea-scenario-preview-image"
          src={`data:image/png;base64,${image}`}
          onClick={onClick}
        />
      )}
    </div>
  );
};

const useGenerateScenarioImage = (projectPath, scenario) => {
  const [data, setData] = useState({ image: null });
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const resp = await axios.get(
          `http://localhost:5050/api/project/scenario/${scenario}/image`,
          { params: { projectPath: projectPath } }
        );
        setData(resp.data);
      } catch (err) {
        console.log(err.response.data);
        setError(err.response.data);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return [data.image, isLoading, error];
};

const EditScenarioMenu = ({ scenario, projectPath }) => {
  const [isModalVisible, setModalVisible] = useState(false);
  const fetchProject = useFetchProject();

  const showConfirm = () => {
    let secondsToGo = 3;
    const modal = Modal.confirm({
      title: `Are you sure you want to delete this scenario?`,
      content: (
        <div>
          <p>
            <b>{scenario}</b>
          </p>
          <p>
            <i>(This operation cannot be reversed)</i>
          </p>
        </div>
      ),
      okText: `DELETE (${secondsToGo})`,
      okType: 'danger',
      okButtonProps: { disabled: true },
      cancelText: 'Cancel',
      onOk: () => deleteScenario(scenario, () => fetchProject()),
      centered: true,
    });

    const timer = setInterval(() => {
      secondsToGo -= 1;
      modal.update({
        okText: `DELETE (${secondsToGo})`,
      });
    }, 1000);
    setTimeout(() => {
      clearInterval(timer);
      modal.update({
        okButtonProps: { disabled: false },
        okText: 'DELETE',
      });
    }, secondsToGo * 1000);
  };

  return (
    <span id={`${scenario}-edit-button`} className="scenario-edit-button">
      <Dropdown
        overlay={
          <Menu>
            <Menu.Item key="rename" onClick={() => setModalVisible(true)}>
              Rename
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              key="delete"
              onClick={showConfirm}
              style={{ color: 'red' }}
            >
              Delete
            </Menu.Item>
          </Menu>
        }
        trigger={['click']}
        getPopupContainer={() => {
          return document.getElementById(`${scenario}-edit-button`);
        }}
      >
        <Button>
          Edit <Icon type="down" />
        </Button>
      </Dropdown>
      <RenameScenarioModal
        scenario={scenario}
        projectPath={projectPath}
        visible={isModalVisible}
        setVisible={setModalVisible}
      />
    </span>
  );
};

export default ScenarioCard;
