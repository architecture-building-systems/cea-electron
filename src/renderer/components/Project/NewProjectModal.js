import React, { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { ipcRenderer } from 'electron';
import { Modal, Form } from 'antd';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { getProject } from '../../actions/project';
import parameter from '../Tools/parameter';

const NewProjectModal = ({ visible, setVisible, project }) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const formRef = useRef();
  const dispatch = useDispatch();

  const reloadProject = () => {
    dispatch(getProject());
  };

  const handleOk = e => {
    formRef.current.validateFields(async (err, values) => {
      if (!err) {
        setConfirmLoading(true);
        console.log('Received values of form: ', values);
        try {
          const createProject = await axios.post(
            `http://localhost:5050/api/project/`,
            values
          );
          console.log(createProject.data);
          setConfirmLoading(false);
          const updateProject = await axios.put(
            `http://localhost:5050/api/project/`,
            {
              path: path.join(values.path, values.name)
            }
          );
          console.log(updateProject.data);
          reloadProject();
          setVisible(false);
        } catch (err) {
          console.log(err.response);
          setConfirmLoading(false);
        }
      }
    });
  };

  const handleCancel = e => {
    setVisible(false);
  };

  useEffect(() => {
    !visible && formRef.current && formRef.current.resetFields();
  }, [visible]);

  return (
    <Modal
      title="Create new Project"
      visible={visible}
      width={800}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
    >
      <NewProjectForm ref={formRef} project={project} />
    </Modal>
  );
};

const NewProjectForm = Form.create()(({ form, project }) => {
  // FIXME: ipc listener clash
  useEffect(() => {
    ipcRenderer.on('selected-path', (event, id, path) => {
      form.setFieldsValue({ [id]: path[0] });
    });
    return () => ipcRenderer.removeAllListeners(['selected-path']);
  }, []);
  return (
    <Form layout="horizontal">
      {parameter(
        {
          type: 'InputParameter',
          name: 'name',
          value: '',
          help: 'Name of new Project'
        },
        form,
        {
          rules: [
            { required: true },
            {
              validator: (rule, value, callback) => {
                if (
                  value.length != 0 &&
                  fs.existsSync(path.join(form.getFieldValue('path'), value))
                ) {
                  callback('Folder with name already exists in path');
                } else {
                  callback();
                }
              }
            }
          ]
        }
      )}
      {parameter(
        {
          type: 'PathParameter',
          name: 'path',
          value: path.dirname(project.path),
          help: 'Path of new Project'
        },
        form
      )}
    </Form>
  );
});

export default NewProjectModal;
