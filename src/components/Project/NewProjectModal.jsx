import { useState, useEffect, useMemo } from 'react';
import { Form, Input, Modal } from 'antd';
import { OpenDialogInput } from '../Tools/Parameter';
import {
  checkExist,
  dirname,
  FileNotFoundError,
  InvalidContentType,
  joinPath,
} from '../../utils/file';
import { fetchConfig, useProjectStore } from './store';
import axios from 'axios';

const useFetchConfigProjectInfo = () => {
  const [info, setInfo] = useState({});

  const fetchInfo = async () => {
    try {
      const projectDetails = await fetchConfig();
      setInfo(projectDetails);
    } catch (err) {
      console.error(err);
    }
  };

  return { info, fetchInfo };
};

const NewProjectModal = ({ visible, setVisible, onSuccess }) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchProject = useProjectStore((state) => state.fetchInfo);
  const { info, fetchInfo } = useFetchConfigProjectInfo();

  const initialValue = useMemo(
    () => (info?.project ? dirname(info.project) : null),
    [info?.project],
  );

  useEffect(() => {
    if (visible) fetchInfo();
  }, [visible]);

  const onFinish = async (values) => {
    try {
      setConfirmLoading(true);
      console.log('Received values of form: ', values);
      const resp = await axios.post(
        `${import.meta.env.VITE_CEA_URL}/api/project/`,
        values,
      );
      const { project } = resp.data;
      await fetchProject(project);
      setConfirmLoading(false);
      setVisible(false);
      onSuccess();

      form.resetFields();
    } catch (e) {
      console.log(e);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCancel = () => {
    setVisible(false);
  };

  return (
    <Modal
      title="Create new Project"
      open={visible}
      width={800}
      okText="Create"
      onOk={form.submit}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
      destroyOnClose
    >
      {initialValue && (
        <NewProjectForm
          form={form}
          onFinish={onFinish}
          initialValue={initialValue}
          project={info}
        />
      )}
    </Modal>
  );
};

const NewProjectForm = ({ form, onFinish, initialValue }) => {
  return (
    <Form
      form={form}
      onFinish={onFinish}
      labelCol={{ span: 6 }}
      wrapperCol={{ span: 15, offset: 1 }}
    >
      <Form.Item
        name="project_name"
        label="Project Name"
        extra="Name of new Project"
        validateFirst
        rules={[
          { required: true, message: 'Project name cannot be empty' },
          {
            validator: async (_, value) => {
              const projectRoot = form.getFieldValue('project_root');

              const contentPath = joinPath(projectRoot, value);
              try {
                const pathExists = await checkExist(contentPath, 'directory');
                if (value.length != 0 && pathExists) {
                  return Promise.reject('project name already exists in path');
                }
              } catch (error) {
                if (!(error instanceof FileNotFoundError)) {
                  throw error;
                }
              }

              return Promise.resolve();
            },
          },
        ]}
      >
        <Input placeholder="new_project" autoComplete="off" />
      </Form.Item>

      {/* Only allow project root to be set if it is not already set */}
      <Form.Item
        name="project_root"
        label="Project Root"
        initialValue={initialValue}
        extra="Path of new Project"
        rules={[
          {
            validator: async (_, value) => {
              if (value.length == 0)
                return Promise.reject('Project cannot be empty');
              await checkExist(value, 'directory');
              return Promise.resolve();
            },
          },
        ]}
      >
        <OpenDialogInput form={form} type="directory" />
      </Form.Item>
    </Form>
  );
};

export default NewProjectModal;
