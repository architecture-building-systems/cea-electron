import { useState, useEffect, useRef } from 'react';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import positron from '../../constants/mapStyles/positron.json';
import {
  EditableGeoJsonLayer,
  DrawPolygonMode,
  ModifyMode,
  ViewMode,
} from '@deck.gl-community/editable-layers';
import { Button } from 'antd';
import './EditableMap.css';
import { DeckGL } from '@deck.gl/react';
import { calcPolyArea } from './utils';

const defaultViewState = {
  longitude: 0,
  latitude: 0,
  zoom: 0,
  pitch: 0,
  bearing: 0,
};

const EMPTY_FEATURE = {
  type: 'FeatureCollection',
  features: [],
};

const EditableMap = ({
  location = defaultViewState,
  geojson = EMPTY_FEATURE,
  setValue = () => {},
}) => {
  const mapRef = useRef();
  const [viewState, setViewState] = useState(location);
  const [mode, setMode] = useState(null);
  const [data, setData] = useState(geojson !== null ? geojson : EMPTY_FEATURE);
  const [selectedFeatureIndexes, setSelectedFeatureIndexes] = useState([]);
  const hasData = data.features.length > 0;

  const layer = new EditableGeoJsonLayer({
    id: 'geojson-layer',
    data: data,
    mode:
      mode === 'draw'
        ? DrawPolygonMode
        : mode === 'edit'
          ? ModifyMode
          : ViewMode,
    selectedFeatureIndexes: selectedFeatureIndexes,

    onEdit: (e) => {
      if (e.editType === 'addFeature') {
        setData(e.updatedData);
        setMode(null);
      } else if (
        ['removePosition', 'movePosition', 'addPosition'].includes(e.editType)
      ) {
        setData(e.updatedData);
      }
    },
  });

  const ToggleDraw = () => {
    if (mode !== 'draw') {
      setMode('draw');
    } else {
      setMode(null);
    }
  };

  const ToggleEdit = () => {
    if (mode !== 'edit') {
      setMode('edit');
    } else {
      setMode(null);
    }
  };

  const deletePolygon = () => {
    setData(EMPTY_FEATURE);
    setSelectedFeatureIndexes([]);
  };

  useEffect(() => {
    if (location.bbox && mapRef.current) {
      const mapbox = mapRef.current.getMap();

      const { zoom } = mapbox.cameraForBounds(location.bbox, {
        maxZoom: 18,
      });

      setViewState((viewState) => ({
        ...viewState,
        zoom: zoom,
        latitude: location.latitude,
        longitude: location.longitude,
      }));

      // Trigger a refresh so that map is zoomed correctly
      mapRef.current.zoomTo(zoom);
    } else {
      setViewState((viewState) => ({ ...viewState, ...location }));
    }
  }, [location]);

  useEffect(() => {
    if (mode === 'draw') setData(EMPTY_FEATURE);
    else if (mode === 'edit') setSelectedFeatureIndexes([0]);
    else setSelectedFeatureIndexes([]);
  }, [mode]);

  useEffect(() => {
    setValue(data);
  }, [data]);

  return (
    <>
      {hasData && (
        <div id="edit-map-area-info">
          {`Area size: ${calcPolyArea(data)} km2`}
        </div>
      )}
      <div id="edit-map-buttons">
        {hasData ? (
          <>
            <Button
              type={mode === 'edit' ? 'primary' : 'default'}
              onClick={ToggleEdit}
            >
              Edit
            </Button>
            <Button type="primary" onClick={deletePolygon} danger>
              Delete
            </Button>
          </>
        ) : (
          <Button
            type={mode === 'draw' ? 'primary' : 'default'}
            onClick={ToggleDraw}
          >
            Draw
          </Button>
        )}
      </div>

      <div onContextMenu={(e) => e.preventDefault()}>
        <DeckGL
          initialViewState={viewState}
          viewState={viewState}
          controller={{ dragRotate: false, doubleClickZoom: false }}
          layers={[layer]}
          onViewStateChange={({ viewState }) => {
            setViewState(viewState);
          }}
        >
          <Map
            ref={mapRef}
            mapStyle={positron}
            onLoad={(e) => {
              if (location.bbox) {
                const mapbox = e.target;
                const { zoom } = mapbox.cameraForBounds(location.bbox, {
                  maxZoom: 18,
                });
                setViewState((viewState) => ({
                  ...viewState,
                  zoom: zoom,
                }));
              }
            }}
          />
        </DeckGL>
      </div>
    </>
  );
};

export default EditableMap;
