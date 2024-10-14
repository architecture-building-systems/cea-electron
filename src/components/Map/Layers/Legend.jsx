import Gradient from 'javascript-color-gradient';
import { useMapStore } from '../store/store';
import { Select } from 'antd';
import { useEffect, useState } from 'react';

const ColourRampLegend = ({ label, colours, points, range }) => {
  const [index, setIndex] = useState(0);
  const _range = useMapStore((state) => state.range);
  const setRange = useMapStore((state) => state.setRange);

  const { min, max } = range?.[index] ?? { min: 0, max: 0 };

  const gradientArray = new Gradient()
    .setColorGradient(...colours)
    .setMidpoint(points)
    .getColors();

  useEffect(() => {
    const { min, max } = range[index];
    setRange([min, max]);
  }, [index, min, max]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div>
        <b>{label}</b>
      </div>
      <div>
        Range
        <Select
          value={index}
          onChange={setIndex}
          defaultValue={0}
          style={{ margin: 12, width: 200 }}
        >
          {range.map(({ label }, index) => {
            return (
              <Select.Option key={index} value={index}>
                {label}
              </Select.Option>
            );
          })}
        </Select>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {gradientArray.map((color) => {
          return (
            <div
              style={{ backgroundColor: color, width: 18, height: 18 }}
              key={color}
              title={color}
            />
          );
        })}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <div>{Math.round(_range[0])}</div>
        <div>{Math.round(_range[1])}</div>
      </div>
    </div>
  );
};

export const Legend = () => {
  const selectedMapCategory = useMapStore((state) => state.selectedMapCategory);
  const mapLayerLegends = useMapStore((state) => state.mapLayerLegends);

  if (!selectedMapCategory?.layers) return null;

  return (
    <div
      className="cea-overlay-card"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 12,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',

        boxSizing: 'border-box',

        display: 'flex',
        flexDirection: 'column',

        fontSize: 12,

        gap: 2,

        minWidth: 250,

        padding: 12,
        marginRight: 'auto',
      }}
    >
      {Object.keys(mapLayerLegends ?? {}).map((key) => {
        const value = mapLayerLegends[key];
        return (
          <ColourRampLegend
            key={key}
            label={value.label}
            colours={value.colourArray}
            points={value.points}
            range={value.range}
          />
        );
      })}
    </div>
  );
};
