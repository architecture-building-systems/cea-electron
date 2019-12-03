import React from 'react';
import { remote } from 'electron';
import fs from 'fs';
import { Form, Input, Icon, Switch, Select, Divider, Button } from 'antd';

const parameter = (param, form, config = {}) => {
  const { name, type, value, help } = param;
  const { getFieldDecorator, setFieldsValue } = form;
  const openDialog = () => {
    const options =
      type === 'PathParameter'
        ? { properties: ['openDirectory'] }
        : { properties: ['openFile'] };
    remote.dialog.showOpenDialog(remote.getCurrentWindow(), options, paths => {
      if (paths.length) {
        form.setFieldsValue({ [name]: paths[0] });
      }
    });
  };

  let input = [];

  if (['IntegerParameter', 'RealParameter'].includes(type)) {
    const stringValue = value !== null ? value.toString() : '';
    const regex =
      type === 'IntegerParameter'
        ? /^([1-9][0-9]*|0)$/
        : /^([1-9][0-9]*|0)(\.\d+)?$/;
    input = (
      <React.Fragment>
        {getFieldDecorator(name, {
          initialValue: stringValue,
          rules: [
            {
              type: 'number',
              message: `Please enter an ${
                type === 'IntegerParameter' ? 'integer' : 'float'
              }`,
              transform: num => {
                if (num === '') return 0;
                return regex.test(num) ? Number(num) : NaN;
              }
            }
          ],
          ...config
        })(<Input />)}
      </React.Fragment>
    );
  } else if (['PathParameter', 'FileParameter'].includes(type)) {
    input = (
      <React.Fragment>
        {getFieldDecorator(name, {
          initialValue: value,
          rules: [
            {
              validator: (rule, value, callback) => {
                if (!fs.existsSync(value)) {
                  callback('Path does not exist');
                } else {
                  callback();
                }
              }
            }
          ],
          ...config
        })(
          <Input
            addonAfter={
              <button
                className={type}
                type="button"
                style={{ height: '30px', width: '50px' }}
                onClick={openDialog}
              >
                <Icon type="ellipsis" />
              </button>
            }
          />
        )}
      </React.Fragment>
    );
  } else if (
    [
      'ChoiceParameter',
      'PlantNodeParameter',
      'RegionParameter',
      'ScenarioNameParameter',
      'SingleBuildingParameter'
    ].includes(type)
  ) {
    const { choices } = param;
    const { Option } = Select;
    const Options = choices.map(choice => (
      <Option key={choice} value={choice}>
        {choice}
      </Option>
    ));
    input = (
      <React.Fragment>
        {getFieldDecorator(name, {
          initialValue: value,
          ...config
        })(<Select>{Options}</Select>)}
      </React.Fragment>
    );
  } else if (['MultiChoiceParameter', 'BuildingsParameter'].includes(type)) {
    const { choices } = param;
    const { Option } = Select;
    const Options = choices.map(choice => (
      <Option key={choice} value={choice}>
        {choice}
      </Option>
    ));

    const selectAll = e => {
      e.preventDefault();
      setFieldsValue({
        [name]: choices
      });
    };

    const unselectAll = e => {
      e.preventDefault();
      setFieldsValue({
        [name]: []
      });
    };

    input = (
      <React.Fragment>
        {getFieldDecorator(name, {
          initialValue: value,
          ...config
        })(
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Nothing Selected"
            showArrow
            maxTagCount={10}
            dropdownRender={menu => (
              <div>
                <div style={{ padding: '8px', textAlign: 'center' }}>
                  <Button onMouseDown={selectAll} style={{ width: '45%' }}>
                    Select All
                  </Button>
                  <Button onMouseDown={unselectAll} style={{ width: '45%' }}>
                    Unselect All
                  </Button>
                </div>
                <Divider style={{ margin: '4px 0' }} />
                {menu}
              </div>
            )}
          >
            {Options}
          </Select>
        )}
      </React.Fragment>
    );
  } else if (type === 'WeatherPathParameter') {
    const { choices } = param;
    const { Option } = Select;
    const Options = Object.keys(choices).map(choice => (
      <Option key={choice} value={choices[choice]}>
        {choice}
      </Option>
    ));
    input = (
      <React.Fragment>
        {getFieldDecorator(name, {
          initialValue: value,
          rules: [{ required: true }],
          ...config
        })(
          <Select
            dropdownRender={menu => (
              <div>
                {menu}
                <Divider style={{ margin: '4px 0' }} />
                <div
                  style={{ padding: '8px', cursor: 'pointer' }}
                  onMouseDown={openDialog}
                  role="button"
                  tabIndex={0}
                >
                  <Icon type="plus" /> Browse for weather file
                </div>
              </div>
            )}
          >
            {Options}
          </Select>
        )}
      </React.Fragment>
    );
  } else if (type === 'BooleanParameter') {
    input = (
      <React.Fragment>
        {getFieldDecorator(name, {
          initialValue: value,
          valuePropName: 'checked',
          ...config
        })(<Switch />)}
      </React.Fragment>
    );
  } else {
    input = (
      <React.Fragment>
        {getFieldDecorator(name, {
          initialValue: value,
          ...config
        })(<Input />)}
      </React.Fragment>
    );
  }

  return (
    <Form.Item
      label={name}
      labelCol={{ span: 6 }}
      wrapperCol={{ span: 11, offset: 1 }}
      key={name}
    >
      {input}
      <br />
      <small style={{ display: 'block', lineHeight: 'normal' }}>{help}</small>
    </Form.Item>
  );
};

export default parameter;
