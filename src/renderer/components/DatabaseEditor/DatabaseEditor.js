import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { Tabs, Icon, Button, Modal, Menu } from 'antd';
import { withErrorBoundary } from '../../utils/ErrorBoundary';
import CenterSpinner from '../HomePage/CenterSpinner';
import './DatabaseEditor.css';
import {
  resetDatabaseState,
  initDatabaseState
} from '../../actions/databaseEditor';
import Table, { TableButtons, useTableUpdateRedux } from './Table';
import { Route, Switch, useParams } from 'react-router-dom';
import { months_short } from '../../constants/months';
import { AsyncError } from '../../utils';
import routes from '../../constants/routes';
import { useChangeRoute } from '../Project/Project';

const useDatabaseGlossary = columns => {
  const dbGlossary = useSelector(state => state.databaseEditor.glossary);
  const [tableGlossary, setTableGlossary] = useState([]);

  useEffect(() => {
    setTableGlossary(
      columns
        .map(col => dbGlossary.find(variable => col === variable.VARIABLE))
        .filter(obj => typeof obj !== 'undefined')
    );
  }, [columns]);

  return tableGlossary;
};

const useValidateDatabasePath = () => {
  const [valid, setValid] = useState(null);

  const checkDBPathValidity = async () => {
    try {
      setValid(null);
      const resp = await axios.get(
        'http://localhost:5050/api/inputs/databases/check'
      );
      setValid(true);
    } catch (err) {
      console.log(err);
      setValid(false);
    }
  };

  useEffect(() => {
    checkDBPathValidity();
  }, []);

  return [valid, checkDBPathValidity];
};

const ValidationErrors = ({ databaseCategories }) => {
  const validation = useSelector(state => state.databaseEditor.validation);

  return (
    <div>
      {Object.keys(validation).length ? (
        <div
          style={{ border: '2px solid red', maxHeight: 200, overflow: 'auto' }}
        >
          <h1>Errors Found:</h1>
          {Object.keys(validation).map(database => {
            const sheets = validation[database];
            const dbCategory = Object.keys(databaseCategories)
              .find(key => databaseCategories[key].includes(database))
              .toUpperCase();
            return (
              <div key={database} style={{ marginBottom: 10 }}>
                <b
                  style={{
                    display: 'block'
                  }}
                >
                  {`${dbCategory} - ${database}`}
                </b>
                {Object.keys(sheets).map(sheet => {
                  const rows = sheets[sheet];
                  return (
                    <div key={sheet}>
                      {Object.keys(rows).map(row => (
                        <div
                          key={row}
                        >{`Sheet: ${sheet} Row: ${row} Col: ${Object.keys(
                          rows[row]
                        ).join(', ')}`}</div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

const SavingDatabaseModal = ({ visible, hideModal, error, success }) => {
  const goToScript = useChangeRoute(`${routes.TOOLS}/data-helper`);
  return (
    <Modal
      visible={visible}
      width={800}
      footer={false}
      onCancel={hideModal}
      closable={false}
      maskClosable={false}
      destroyOnClose={true}
    >
      {error ? (
        <div>
          <AsyncError error={error} />
          <p>Changes were not saved</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={hideModal}>Cancel</Button>
          </div>
        </div>
      ) : !success ? (
        <div>
          <Icon type="loading" style={{ color: 'blue', margin: 5 }} />
          <span>Saving Databases</span>
        </div>
      ) : (
        <div>
          <h2>Changes Saved!</h2>
          <Button type="primary" onClick={goToScript}>
            Go to Archetypes Mapper
          </Button>
          <Button onClick={hideModal}>Back</Button>
        </div>
      )}
    </Modal>
  );
};

const DatabaseEditor = () => {
  const [valid, checkDBPathValidity] = useValidateDatabasePath();
  const goToScript = useChangeRoute(`${routes.TOOLS}/data-initializer`);

  if (valid === null)
    return (
      <CenterSpinner
        indicator={<Icon type="loading" style={{ fontSize: 24 }} spin />}
        tip="Verifying Databases..."
      />
    );

  return (
    <div className="cea-database-editor">
      <div className="cea-database-editor-header">
        <h2>Database Editor</h2>
        <div>
          <Button type="primary" onClick={goToScript}>
            Assign Database
          </Button>
          <Button type="primary" onClick={goToScript}>
            Export Database
          </Button>
        </div>
      </div>
      <div className="cea-database-editor-content">
        {valid ? (
          <DatabaseContentContainer />
        ) : (
          <div>
            <div>Could not find or validate databases. Try assigning one</div>
            <Button onClick={checkDBPathValidity}>Try Again</Button>
          </div>
        )}
      </div>
      <div className="cea-database-editor-footer"></div>
    </div>
  );
};

const DatabaseContentContainer = () => {
  const { status, error } = useSelector(state => state.databaseEditor.status);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(initDatabaseState());

    // Reset Database state on unmount
    return () => {
      dispatch(resetDatabaseState());
    };
  }, []);

  if (status === 'fetching')
    return (
      <CenterSpinner
        indicator={<Icon type="loading" style={{ fontSize: 24 }} spin />}
        tip="Reading Databases..."
      />
    );
  if (status === 'failed') return <div>{JSON.stringify(error)}</div>;

  if (status !== 'success') return null;

  return <DatabaseContent />;
};

const DatabaseContent = () => {
  return (
    <div>
      <DatabaseTabs />
      <Switch>
        <Route path={`${routes.DATABASE_EDITOR}/:category/:name`}>
          <DatabaseContainer />
        </Route>
        <Route path={routes.DATABASE_EDITOR}>
          <div>Select a database</div>
        </Route>
      </Switch>
    </div>
  );
};

const SaveDatabaseButton = () => {
  const databasesData = useSelector(state => state.databaseEditor.data);
  const databaseValidation = useSelector(
    state => state.databaseEditor.validation
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const hideModal = () => {
    setModalVisible(false);
    setSuccess(null);
    setError(null);
  };

  const saveDB = async () => {
    setModalVisible(true);
    try {
      console.log(databasesData);
      const resp = await axios.put(
        'http://localhost:5050/api/inputs/databases',
        databasesData
      );
      console.log(resp.data);
      setSuccess(true);
    } catch (err) {
      console.log(err.response);
      setError(err.response);
    }
  };
  return (
    <div>
      <Button
        disabled={!!Object.keys(databaseValidation).length}
        onClick={saveDB}
      >
        Save Databases
      </Button>
      <SavingDatabaseModal
        visible={modalVisible}
        hideModal={hideModal}
        error={error}
        success={success}
      />
    </div>
  );
};

const DatabaseTabs = () => {
  const data = useSelector(state => state.databaseEditor.data);
  const [selectedKey, setSelected] = useState(null);
  const [location, setLocation] = useState(null);
  const [visible, setVisible] = useState(false);

  const goToDatabase = useChangeRoute(`${routes.DATABASE_EDITOR}/${location}`);

  const handleOk = () => {
    setVisible(false);
    setLocation(selectedKey);
  };

  const handleCancel = () => {
    setVisible(false);
    setSelected(location);
  };

  useEffect(() => {
    if (selectedKey !== location) setVisible(true);
  }, [selectedKey]);

  useEffect(() => {
    // Prevent going to /database-editor/null on mount
    if (location !== null) goToDatabase();
  }, [location]);

  return (
    <div>
      <Menu
        mode="horizontal"
        onClick={({ key }) => {
          if (location === null) setLocation(key);
          else setSelected(key);
        }}
        selectedKeys={location !== null ? [location] : []}
      >
        {Object.keys(data).map(category => (
          <Menu.SubMenu key={category} title={category.toUpperCase()}>
            {Object.keys(data[category]).map(name => (
              <Menu.Item key={`${category}/${name}`}>{name}</Menu.Item>
            ))}
          </Menu.SubMenu>
        ))}
      </Menu>
      <Modal
        centered
        closable={false}
        visible={visible}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        There are still unsaved changes.
        <br />
        <i>(Any unsaved changes will be discarded)</i>
        <br />
        <br />
        Are you sure you want to navigate away?
      </Modal>
    </div>
  );
};

const DatabaseContainer = () => {
  const data = useSelector(state => state.databaseEditor.data);
  const schema = useSelector(state => state.databaseEditor.schema);
  const { category, name } = useParams();

  return (
    <div>
      <Database
        name={name}
        data={data[category][name]}
        schema={schema[category][name]}
      />
      <SaveDatabaseButton />
    </div>
  );
};

const Database = ({ name, data, schema }) => {
  return (
    <div className="cea-database-editor-database">
      <h2>{name}</h2>
      <Tabs className="cea-database-editor-tabs" type="card">
        {Object.keys(data).map(sheetName => (
          <Tabs.TabPane key={sheetName} tab={sheetName}>
            {name !== 'schedules' ? (
              <DatabaseTable
                databaseName={name}
                sheetName={sheetName}
                sheetData={data[sheetName]}
                schema={schema[sheetName]}
              />
            ) : (
              <SchedulesTable
                databaseName={name}
                sheetName={sheetName}
                sheetData={data[sheetName]}
                schema={schema[sheetName]}
              />
            )}
          </Tabs.TabPane>
        ))}
      </Tabs>
    </div>
  );
};

const useTableSchema = (schema, sheetName, tableData) => {
  const colHeaders = Object.keys(tableData[0]);
  const columns = colHeaders.map(key => {
    if (schema[key]['types_found']) {
      if (['long', 'float', 'int'].includes(schema[key]['types_found'][0])) {
        if (['heating', 'cooling'].includes(sheetName))
          return {
            data: key,
            type: 'numeric',
            validator: (value, callback) => {
              if (value === 'NA' || !isNaN(value)) {
                callback(true);
              } else {
                callback(false);
              }
            }
          };
        else return { data: key, type: 'numeric' };
      }
    }
    return { data: key };
  });
  return { columns, colHeaders };
};

const ColumnGlossary = ({ colHeaders }) => {
  const glossary = useDatabaseGlossary(colHeaders);

  return (
    <React.Fragment>
      {glossary.length !== 0 && (
        <details>
          <summary>Column Glossary</summary>
          {glossary.map(variable => (
            <div key={variable.VARIABLE}>
              <b>{variable.VARIABLE}</b>
              {` - ${variable.DESCRIPTION} / ${variable.UNIT}`}
            </div>
          ))}
        </details>
      )}
    </React.Fragment>
  );
};

const DatabaseTable = ({ databaseName, sheetName, sheetData, schema }) => {
  const tableRef = useRef(null);
  const updateRedux = useTableUpdateRedux(tableRef, databaseName, sheetName);
  const { columns, colHeaders } = useTableSchema(schema, sheetName, sheetData);

  // Validate cells on mount
  useEffect(() => {
    tableRef.current.hotInstance.validateCells();
  }, []);

  return (
    <div className="cea-database-editor-sheet">
      <TableButtons tableRef={tableRef} sheetData={sheetData} />
      <Table
        ref={tableRef}
        id={databaseName}
        data={sheetData}
        contextMenu={true}
        colHeaders={colHeaders}
        rowHeaders={true}
        columns={columns}
        stretchH="all"
        height={400}
      />
    </div>
  );
};

const SchedulesTable = ({ databaseName, sheetName, sheetData, schema }) => {
  return (
    <div className="cea-database-editor-schedules-sheet">
      <p>Yearly/Month</p>
      <SchedulesYearTable
        databaseName={databaseName}
        sheetName={sheetName}
        yearData={sheetData['MONTHLY_MULTIPLIER']}
      />
      <p>Day/Hour</p>
      <SchedulesTypeTab
        databaseName={databaseName}
        sheetName={sheetName}
        scheduleData={sheetData['SCHEDULES']}
      />
    </div>
  );
};

const SchedulesTypeTab = ({ databaseName, sheetName, scheduleData }) => {
  const [selectedType, setSelected] = useState(Object.keys(scheduleData)[0]);
  return (
    <div>
      <SchedulesDataTable
        databaseName={databaseName}
        sheetName={sheetName}
        scheduleType={selectedType}
        data={scheduleData[selectedType]}
      />
      <Tabs
        className="cea-database-editor-tabs"
        size="small"
        animated={false}
        tabPosition="bottom"
        activeKey={selectedType}
        onChange={setSelected}
      >
        {Object.keys(scheduleData).map(scheduleType => (
          <Tabs.TabPane key={scheduleType} tab={scheduleType}></Tabs.TabPane>
        ))}
      </Tabs>
    </div>
  );
};

const fractionFloatValidator = (value, callback) => {
  try {
    if (Number(value) >= 0 && Number(value) <= 1) callback(true);
    else callback(false);
  } catch (error) {
    callback(false);
  }
};

const SchedulesYearTable = ({ databaseName, sheetName, yearData }) => {
  const tableRef = useRef();
  const updateRedux = useTableUpdateRedux(tableRef, databaseName, sheetName);
  const colHeaders = Object.keys(yearData).map(i => months_short[i]);
  const columns = Object.keys(colHeaders).map(key => ({
    data: Number(key),
    type: 'numeric',
    validator: fractionFloatValidator
  }));

  //  Revalidate cells on sheet change
  useEffect(() => {
    tableRef.current.hotInstance.validateCells();
  }, [sheetName]);

  return (
    <div className="cea-database-editor-schedule-year">
      <Table
        ref={tableRef}
        id={`${databaseName}-${sheetName}-year`}
        data={[yearData]}
        rowHeaders="MONTHLY_MULTIPLIER"
        rowHeaderWidth={180}
        colHeaders={colHeaders}
        columns={columns}
        // stretchH="all"
        height={70}
      />
    </div>
  );
};

const SchedulesDataTable = ({
  databaseName,
  sheetName,
  scheduleType,
  data
}) => {
  const tableRef = useRef();
  const updateRedux = useTableUpdateRedux(tableRef, databaseName, sheetName);
  const rowHeaders = Object.keys(data);
  const tableData = rowHeaders.map(row => data[row]);
  const colHeaders = Object.keys(tableData[0]).map(i => Number(i) + 1);
  const columns = Object.keys(colHeaders).map(key => {
    let col = { data: key };
    if (!isNaN(tableData[0][key])) {
      col['type'] = 'numeric';
    }
    return col;
  });

  //  Revalidate cells on sheet and type change
  useEffect(() => {
    tableRef.current.hotInstance.validateCells();
  }, [sheetName, scheduleType]);

  return (
    <div className="cea-database-editor-schedule-data">
      <Table
        ref={tableRef}
        id={`${databaseName}-${sheetName}-data`}
        data={tableData}
        rowHeaders={rowHeaders}
        rowHeaderWidth={80}
        colHeaders={colHeaders}
        columns={columns}
        // stretchH="all"
        height={120}
      />
    </div>
  );
};

export default withErrorBoundary(DatabaseEditor);
