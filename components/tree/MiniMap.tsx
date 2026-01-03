import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

interface MiniMapProps {
  positions: Record<string, { x: number; y: number }>;
  edges: { from: string; to: string }[];
  zoom: number;
  translateX: number;
  translateY: number;
  containerWidth: number;
  containerHeight: number;
  contentWidth: number;
  contentHeight: number;
  tint: string;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  positions,
  edges,
  zoom,
  translateX,
  translateY,
  containerWidth,
  containerHeight,
  contentWidth,
  contentHeight,
  tint,
}) => {
  const MAP_SIZE = 120;
  const padding = 10;
  
  // Calculate scale to fit content into MAP_SIZE
  const scale = (MAP_SIZE - padding * 2) / Math.max(contentWidth, contentHeight, 1);
  
  // Viewport rectangle in content coordinates
  // translateX = (containerWidth/2 - centerX) * zoom
  // So centerX = containerWidth/2 - translateX/zoom
  const viewportWidth = containerWidth / zoom;
  const viewportHeight = containerHeight / zoom;
  const viewportX = -translateX / zoom;
  const viewportY = -translateY / zoom;

  return (
    <View style={[styles.container, { width: MAP_SIZE, height: MAP_SIZE }]}>
      <Svg width={MAP_SIZE} height={MAP_SIZE}>
        {/* Background */}
        <Rect
          x={0}
          y={0}
          width={MAP_SIZE}
          height={MAP_SIZE}
          fill="rgba(0,0,0,0.05)"
          rx={8}
        />
        
        {/* Edges */}
        {edges.map((edge, i) => {
          const from = positions[edge.from];
          const to = positions[edge.to];
          if (!from || !to) return null;
          return (
            <Line
              key={`edge-${i}`}
              x1={from.x * scale + padding}
              y1={from.y * scale + padding}
              x2={to.x * scale + padding}
              y2={to.y * scale + padding}
              stroke="#94a3b8"
              strokeWidth={1}
              opacity={0.3}
            />
          );
        })}

        {/* Nodes */}
        {Object.entries(positions).map(([id, pos]) => (
          <Circle
            key={`node-${id}`}
            cx={pos.x * scale + padding}
            cy={pos.y * scale + padding}
            r={2}
            fill="#94a3b8"
          />
        ))}

        {/* Viewport Indicator */}
        <Rect
          x={viewportX * scale + padding}
          y={viewportY * scale + padding}
          width={viewportWidth * scale}
          height={viewportHeight * scale}
          stroke={tint}
          strokeWidth={1.5}
          fill={`${tint}20`}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden',
    zIndex: 100,
    elevation: 5,
  },
});
