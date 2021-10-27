import { memo, useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { ipcRenderer } from 'electron';
import Icon, {
  EditTwoTone,
  FileTextTwoTone,
  LoadingOutlined,
  PlusOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { Button, Card, Menu, Tooltip, Spin, Empty, Dropdown } from 'antd';
import parser from 'html-react-parser';
import axios from 'axios';
import { ModalContext } from '../../utils/ModalManager';

const defaultPlotStyle = {
  height: 'calc(50vh - 160px)',
  minHeight: 300,
  margin: 5,
};

const useFetchPlotDiv = (dashIndex, index, hash) => {
  const [div, setDiv] = useState(null);
  const [error, setError] = useState(null);

  // Get plot div
  useEffect(() => {
    let mounted = true;
    const source = axios.CancelToken.source();
    const fetch = async () => {
      try {
        const response = await axios.get(
          `${process.env.CEA_URL}/plots/div/${dashIndex}/${index}`,
          {
            cancelToken: source.token,
          }
        );
        if (mounted)
          setDiv(() => {
            let script = null;
            let content = parser(response.data, {
              replace: function (domNode) {
                if (domNode.type === 'script' && domNode.children[0]) {
                  script = domNode.children[0].data;
                }
              },
            }).filter((node) => node.type === 'div' || node.type === 'style');
            return { content, script };
          });
      } catch (err) {
        setError(err.response);
      }
    };

    fetch();

    return () => {
      // Cancel the request if it is not completed
      mounted = false;
      source.cancel();

      // Clean up script node if it is mounted
      let script = document.querySelector(
        `script[data-id=script-cea-react-${hash}]`
      );
      if (script) script.remove();
    };
  }, []);

  // Mount script node when div is mounted
  useEffect(() => {
    if (div) {
      var _script = document.createElement('script');
      _script.dataset.id = `script-cea-react-${hash}`;
      document.body.appendChild(_script);
      _script.append(div.script);
    }
  }, [div]);

  return [div, error];
};

export const Plot = ({ index, dashIndex, data, style, activePlotRef = 0 }) => {
  const plotStyle = { ...defaultPlotStyle, ...style };
  const [div, error] = useFetchPlotDiv(dashIndex, index, data.hash);

  return (
    <Card
      title={
        <div>
          <span style={{ fontWeight: 'bold' }}>{data.title}</span>
          {data.parameters['scenario-name'] && (
            <>
              <span> - </span>
              <small>{data.parameters['scenario-name']}</small>
              {div && div.content && (
                <OpenInWindow
                  index={index}
                  dashIndex={dashIndex}
                  data={data}
                  div={div}
                />
              )}
            </>
          )}
        </div>
      }
      extra={
        <>
          {div && div.content && (
            <>
              <PlotLegendToggle divID={div.content[0].props.id} />
              <InputFiles index={index} activePlotRef={activePlotRef} />
            </>
          )}
          <EditMenu index={index} activePlotRef={activePlotRef} />
        </>
      }
      style={{ ...plotStyle, height: '', minHeight: '' }}
      bodyStyle={{
        height: plotStyle.height,
        minHeight: plotStyle.minHeight,
      }}
      size="small"
    >
      {div ? (
        div.content
      ) : error ? (
        <ErrorPlot error={error} />
      ) : (
        <LoadingPlot plotStyle={plotStyle} />
      )}
    </Card>
  );
};

const PlotLegendToggle = ({ divID }) => {
  const [showLegend, setShowLegend] = useState(true);
  const toggleLegends = () => {
    window.Plotly.relayout(divID, { showlegend: !showLegend });
    setShowLegend(!showLegend);
  };

  return (
    <Tooltip title="Toggle Legend">
      <UnorderedListOutlined
        onClick={toggleLegends}
        style={{ color: showLegend ? '#1890ff' : 'grey' }}
      />
    </Tooltip>
  );
};

const InputFiles = ({ index, activePlotRef }) => {
  const { modals, setModalVisible } = useContext(ModalContext);
  const showModalPlotFiles = () => {
    setModalVisible(modals.plotFiles, true);
    activePlotRef.current = index;
  };

  return (
    <Tooltip title="Show plot data files">
      <FileTextTwoTone onClick={showModalPlotFiles} />
    </Tooltip>
  );
};

const OpenInWindow = ({ index, dashIndex }) => {
  const openNewWindow = () => {
    ipcRenderer.invoke('open-plot-window', { index, dashIndex });
  };

  return (
    <Tooltip title="Open in new window">
      <Icon
        component={() => (
          <svg viewBox="0 0 1091 1000" width="1em" height="1em">
            <path
              d="M1091 0v636H818v364H0V364h273V0h818zM818 545h182V182H364v182h454v181zM91 909h636V545H91v364z"
              fill="#1890ff"
            />
          </svg>
        )}
        style={{ margin: '0 10px' }}
        onClick={openNewWindow}
      />
    </Tooltip>
  );
};

const EditMenu = memo(({ index, activePlotRef }) => {
  const { modals, setModalVisible } = useContext(ModalContext);

  const showModalEditParameters = () => {
    setModalVisible(modals.editParameters, true);
    activePlotRef.current = index;
  };
  const showModalChangePlot = () => {
    setModalVisible(modals.changePlot, true);
    activePlotRef.current = index;
  };
  const showModalDeletePlot = () => {
    setModalVisible(modals.deletePlot, true);
    activePlotRef.current = index;
  };

  const menu = (
    <Menu>
      <Menu.Item key="changePlot" onClick={showModalChangePlot}>
        Change Plot
      </Menu.Item>
      <Menu.Item key="editParameters" onClick={showModalEditParameters}>
        Edit Parameters
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="deletePlot" onClick={showModalDeletePlot}>
        <div style={{ color: 'red' }}>Delete Plot</div>
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      <Dropdown overlay={menu} trigger={['click']}>
        <EditTwoTone />
      </Dropdown>
    </>
  );
});

const LoadingPlot = ({ plotStyle = defaultPlotStyle }) => {
  return (
    <Spin
      indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
      tip="Loading Plot..."
    >
      <div style={{ height: plotStyle.height }} />
    </Spin>
  );
};

const ErrorPlot = ({ error }) => {
  if (error.status === 404)
    return (
      <div style={{ height: '100%', overflow: 'auto' }}>
        {parser(error.data, {
          replace: function (domNode) {
            if (domNode.type === 'tag' && domNode.name === 'a') {
              return (
                <Link to={domNode.attribs.href}>
                  {domNode.children[0].data}
                </Link>
              );
            }
          },
        })}
      </div>
    );
  if (error.status === 500)
    return (
      <>
        <div style={{ textAlign: 'center', margin: 20 }}>
          <h3>Something went wrong!</h3>
        </div>
        <pre
          style={{
            height: '70%',
            fontSize: 10,
            overflow: 'auto',
          }}
        >
          {error.data}
        </pre>
      </>
    );
  return null;
};

export const EmptyPlot = ({ style, index, activePlotRef }) => {
  const { modals, setModalVisible } = useContext(ModalContext);

  const showModalAddPlot = () => {
    setModalVisible(modals.addPlot, true);
    activePlotRef.current = index;
  };

  const plotStyle = { ...defaultPlotStyle, ...style };

  return (
    <Card
      title="Empty Plot"
      style={{ ...plotStyle, height: '', minHeight: '' }}
      bodyStyle={{ height: plotStyle.height, minHeight: plotStyle.minHeight }}
      size="small"
    >
      <Empty>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={showModalAddPlot}
        >
          Add plot
        </Button>
      </Empty>
    </Card>
  );
};
